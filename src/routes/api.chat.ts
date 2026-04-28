import { createFileRoute } from '@tanstack/react-router';
import type { ChatRequest, StreamChunk } from '@/types/chat.types';

// @ts-ignore
import { env as cfEnv } from 'cloudflare:workers';

// Request validation
function validateChatRequest(body: unknown): { valid: boolean; data?: ChatRequest; error?: string } {
// ... (rest of validation same)
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
      stream: req.stream !== false,
    },
  };
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
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream<Uint8Array>> {
  // Access env vars safely for both Node and Cloudflare/Worker environments
  const env = typeof process !== 'undefined' ? process.env : (globalThis as any).env || {};
  const apiKey = env.NVIDIA_NIM_API_KEY;
  const baseUrl = env.NVIDIA_NIM_BASE_URL;
  const model = env.NVIDIA_NIM_MODEL;

  if (!apiKey || !baseUrl || !model) {
    console.error('Missing NVIDIA environment variables:', { 
      hasApiKey: !!apiKey, 
      hasBaseUrl: !!baseUrl, 
      hasModel: !!model 
    });
    throw new Error('NVIDIA NIM environment variables not configured on server');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 16384,
      temperature: 1,
      top_p: 0.95,
      chat_template_kwargs: { thinking: false },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
  }

  return response.body!;
}

// Parse SSE stream from NVIDIA and convert to our format
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
              if (data === '[DONE]') {
                const doneChunk: StreamChunk = { type: 'done' };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content) {
                  const chunk: StreamChunk = { type: 'chunk', content };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } catch (e) {
                console.error('Failed to parse SSE chunk:', e);
              }
            }
          }
        }

        const doneChunk: StreamChunk = { type: 'done' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
        controller.close();
      } catch (error) {
        const errorChunk: StreamChunk = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Stream error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
        controller.error(error);
      }
    },
  });
}

export const Route = createFileRoute('/api/chat')({
  // @ts-ignore - server property is valid in TanStack Start v1.167
  server: {
    handlers: {
      GET: async () => {
        const pEnv = typeof process !== 'undefined' ? process.env : {};
        const gEnv = (globalThis as any).env || {};
        const gThis = globalThis as any;
        
        // List of places we check
        const checks = {
          cf_workers_env: {
            API_KEY: !!(cfEnv && cfEnv.NVIDIA_NIM_API_KEY),
            BASE_URL: !!(cfEnv && cfEnv.NVIDIA_NIM_BASE_URL),
            MODEL: !!(cfEnv && cfEnv.NVIDIA_NIM_MODEL),
          },
          process_env: {
            API_KEY: !!pEnv.NVIDIA_NIM_API_KEY,
            BASE_URL: !!pEnv.NVIDIA_NIM_BASE_URL,
            MODEL: !!pEnv.NVIDIA_NIM_MODEL,
          },
          globalThis_env: {
            API_KEY: !!gEnv.NVIDIA_NIM_API_KEY,
            BASE_URL: !!gEnv.NVIDIA_NIM_BASE_URL,
            MODEL: !!gEnv.NVIDIA_NIM_MODEL,
          }
        };

        return new Response(JSON.stringify({ 
          status: 'Chat API Diagnostics v3',
          checks,
          cfEnvKeys: cfEnv ? Object.keys(cfEnv) : [],
          processEnvKeys: Object.keys(pEnv).filter(k => !k.includes('KEY') && !k.includes('SECRET')),
          runtime: typeof process !== 'undefined' ? 'Node/Compat' : 'Worker Native'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      },
      POST: async ({ request }) => {
    try {
      const body = await request.json();
      const validation = validateChatRequest(body);

      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const chatRequest = validation.data!;
      const systemPrompt = buildSystemPrompt(chatRequest.context);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: chatRequest.message },
      ];

      // Robust env var getter for server handlers
      const getEnvVar = (name: string) => {
        const pEnv = typeof process !== 'undefined' ? process.env : {};
        const gEnv = (globalThis as any).env || {};
        const gThis = globalThis as any;
        const iEnv = import.meta.env as any;
        
        // Priority order for environment variable detection
        return (cfEnv && cfEnv[name]) || 
               pEnv[name] || 
               gEnv[name] || 
               gThis[name] || 
               (gThis.env && gThis.env[name]) ||
               iEnv[name];
      };

      if (chatRequest.stream) {
        const apiKey = getEnvVar('NVIDIA_NIM_API_KEY');
        const baseUrl = getEnvVar('NVIDIA_NIM_BASE_URL');
        const model = getEnvVar('NVIDIA_NIM_MODEL');

        if (!apiKey || !baseUrl || !model) {
          throw new Error(`Missing NVIDIA NIM environment variables: ${!apiKey ? 'API_KEY ' : ''}${!baseUrl ? 'BASE_URL ' : ''}${!model ? 'MODEL' : ''}`);
        }

        const nvidiaStream = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            max_tokens: 16384,
            temperature: 1,
            top_p: 0.95,
            chat_template_kwargs: { thinking: false },
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`NVIDIA API error: ${res.status}`);
          return res.body!;
        });

        const sseStream = parseSSEStream(nvidiaStream);

        return new Response(sseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Non-streaming fallback
      const apiKey = getEnvVar('NVIDIA_NIM_API_KEY');
      const baseUrl = getEnvVar('NVIDIA_NIM_BASE_URL');
      const model = getEnvVar('NVIDIA_NIM_MODEL');

      if (!apiKey || !baseUrl || !model) {
        throw new Error('NVIDIA NIM environment variables not configured on server');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          max_tokens: 16384,
          temperature: 1,
          top_p: 0.95,
          chat_template_kwargs: { thinking: false },
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
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Chat API error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
      },
    },
  },
});
