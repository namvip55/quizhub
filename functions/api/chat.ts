import type { ChatRequest, StreamChunk } from '../../src/types/chat.types';

interface Env {
  NVIDIA_NIM_API_KEY: string;
  NVIDIA_NIM_BASE_URL: string;
  NVIDIA_NIM_MODEL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RATE_LIMIT_KV?: KVNamespace;
}

// Request validation schema (manual Zod-like validation)
function validateChatRequest(body: unknown): { valid: boolean; data?: ChatRequest; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = body as Record<string, unknown>;

  if (typeof req.message !== 'string' || req.message.trim().length === 0) {
    return { valid: false, error: 'Message is required and must be a non-empty string' };
  }

  if (req.message.length > 4000) {
    return { valid: false, error: 'Message too long (max 4000 characters)' };
  }

  if (req.sessionId && typeof req.sessionId !== 'string') {
    return { valid: false, error: 'sessionId must be a string' };
  }

  if (req.userId && typeof req.userId !== 'string') {
    return { valid: false, error: 'userId must be a string' };
  }

  if (req.stream !== undefined && typeof req.stream !== 'boolean') {
    return { valid: false, error: 'stream must be a boolean' };
  }

  return {
    valid: true,
    data: {
      message: req.message as string,
      sessionId: req.sessionId as string | undefined,
      userId: req.userId as string | undefined,
      context: req.context as ChatRequest['context'],
      stream: req.stream !== false, // Default to true
    },
  };
}

// Rate limiting: 10 requests per minute per identifier
async function checkRateLimit(
  identifier: string,
  kv: KVNamespace | undefined
): Promise<{ allowed: boolean; remaining: number }> {
  if (!kv) {
    // No KV namespace configured, allow all requests
    return { allowed: true, remaining: 10 };
  }

  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 10;

  const data = await kv.get(key, 'json');
  const requests: number[] = (data as number[]) || [];

  // Filter out requests older than 1 minute
  const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);

  if (recentRequests.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Add current request
  recentRequests.push(now);
  await kv.put(key, JSON.stringify(recentRequests), { expirationTtl: 120 });

  return { allowed: true, remaining: maxRequests - recentRequests.length };
}

// Build system prompt with context
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let basePrompt = `You are a helpful AI assistant for QuizHub Pro, an online assessment platform. You help students understand exam questions and teachers create better assessments.

Guidelines:
- Be concise and educational
- When explaining answers, guide students to think critically rather than giving direct answers
- For code-related questions, provide syntax-highlighted examples
- Be encouraging and supportive`;

  if (context?.type === 'question' && context.questionContent) {
    basePrompt += `\n\nCurrent Context: The user is viewing this exam question:\n"${context.questionContent}"`;
  } else if (context?.type === 'exam' && context.examTopic) {
    basePrompt += `\n\nCurrent Context: The user is taking an exam on: ${context.examTopic}`;
  }

  return basePrompt;
}

// NVIDIA NIM API streaming call
async function streamNvidiaResponse(
  messages: Array<{ role: string; content: string }>,
  env: Env
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${env.NVIDIA_NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.NVIDIA_NIM_MODEL,
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
  }

  return response.body!;
}

// Parse SSE stream from NVIDIA
function parseSSEStream(nvidiaStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = nvidiaStream.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content) {
                  const chunk: StreamChunk = { type: 'chunk', content };
                  controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(chunk)}\n\n`));
                }
              } catch (e) {
                console.error('Failed to parse SSE chunk:', e);
              }
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request
    const body = await request.json();
    const validation = validateChatRequest(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatRequest = validation.data!;

    // Rate limiting
    const identifier = chatRequest.userId || request.headers.get('CF-Connecting-IP') || 'anonymous';
    const rateLimit = await checkRateLimit(identifier, env.RATE_LIMIT_KV);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Try again in a minute.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      );
    }

    // Build messages array
    const systemPrompt = buildSystemPrompt(chatRequest.context);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chatRequest.message },
    ];

    // Stream response
    if (chatRequest.stream) {
      const nvidiaStream = await streamNvidiaResponse(messages, env);
      const sseStream = parseSSEStream(nvidiaStream);

      return new Response(sseStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    // Non-streaming fallback
    const response = await fetch(`${env.NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.NVIDIA_NIM_MODEL,
        messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          content,
          messageId: crypto.randomUUID(),
          sessionId: chatRequest.sessionId || crypto.randomUUID(),
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
