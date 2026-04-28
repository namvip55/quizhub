import { createFileRoute } from '@tanstack/react-router';
import type { ChatRequest, StreamChunk } from '@/types/chat.types';

// Helper to get environment variables in both Node.js and Cloudflare Workers
function getEnvVar(name: string, context?: any): string | undefined {
  // Priority order for environment variable access:

  // 1. Cloudflare Workers context (passed via handler) - Primary method for TanStack Start
  if (context?.env?.[name]) return context.env[name];
  if (context?.cloudflare?.env?.[name]) return context.cloudflare.env[name];

  // 2. Cloudflare global env (Worker runtime)
  const gThis = globalThis as any;
  if (gThis.env?.[name]) return gThis.env[name];

  // 3. Node.js process.env (local development)
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name];
  }

  // 4. Vite import.meta.env (build-time)
  try {
    // @ts-ignore - import.meta is only available in Vite builds
    if ((import.meta as any).env?.[name]) {
      // @ts-ignore
      return (import.meta as any).env[name];
    }
  } catch (e) {
    // import.meta not available in this environment
  }

  return undefined;
}

// Request validation
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
      POST: async ({ request, context }) => {
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

          // Get environment variables with context (Cloudflare Workers passes env via context)
          const apiKey = getEnvVar('NVIDIA_NIM_API_KEY', context);
          const baseUrl = getEnvVar('NVIDIA_NIM_BASE_URL', context);
          const model = getEnvVar('NVIDIA_NIM_MODEL', context);

          if (!apiKey || !baseUrl || !model) {
            return new Response(
              JSON.stringify({
                error: 'Server configuration error: NVIDIA API environment variables not configured',
                debug: {
                  missing: {
                    apiKey: !apiKey,
                    baseUrl: !baseUrl,
                    model: !model
                  },
                  runtime: typeof process !== 'undefined' ? 'Node' : 'Worker',
                  hasContext: !!context,
                  contextKeys: context ? Object.keys(context) : [],
                  hasCfInContext: !!context?.cloudflare,
                  hasEnvInContext: !!context?.env,
                  hasGlobalEnv: !!(globalThis as any).env
                }
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if (chatRequest.stream) {
            const nvidiaResponse = await fetch(`${baseUrl}/chat/completions`, {
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
                temperature: 0.7,
                top_p: 0.95,
              }),
            });

            if (!nvidiaResponse.ok) {
              const errorText = await nvidiaResponse.text();
              throw new Error(`NVIDIA API error: ${nvidiaResponse.status} ${errorText}`);
            }

            const nvidiaStream = nvidiaResponse.body!;
            const sseStream = parseSSEStream(nvidiaStream);

            return new Response(sseStream, {
              headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable buffering for Nginx/Proxies
              },
            });
          }

          // Non-streaming fallback
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
              temperature: 0.7,
              top_p: 0.95,
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
