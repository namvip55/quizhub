import { createFileRoute } from '@tanstack/react-router';
import type { ChatRequest, StreamChunk } from '@/types/chat.types';

// Helper to get environment variables in both Node.js and Cloudflare Workers
function getEnvVar(name: string, context?: any): string | undefined {
  const viteName = `VITE_${name}`;

  // Priority order for environment variable access:

  // 1. Vite import.meta.env (build-time) - PRIMARY for TanStack Start on Cloudflare
  try {
    // @ts-ignore - import.meta is only available in Vite builds
    const viteEnv = (import.meta as any).env;
    if (viteEnv?.[name]) return viteEnv[name];
    if (viteEnv?.[viteName]) return viteEnv[viteName];
  } catch (e) {
    // import.meta not available in this environment
  }

  // 2. Cloudflare global env (Worker runtime)
  const gThis = globalThis as any;
  if (gThis.env?.[name]) return gThis.env[name];
  if (gThis.env?.[viteName]) return gThis.env[viteName];

  // 3. Cloudflare Workers context (passed via handler)
  if (context?.env?.[name]) return context.env[name];
  if (context?.env?.[viteName]) return context.env[viteName];
  if (context?.cloudflare?.env?.[name]) return context.cloudflare.env[name];
  if (context?.cloudflare?.env?.[viteName]) return context.cloudflare.env[viteName];

  // 4. Node.js process.env (local development)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[name]) return process.env[name];
    if (process.env[viteName]) return process.env[viteName];
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
          const apiKey = await getEnvVar('NVIDIA_NIM_API_KEY', context);
          const baseUrl = await getEnvVar('NVIDIA_NIM_BASE_URL', context);
          const model = await getEnvVar('NVIDIA_NIM_MODEL', context);

          if (!apiKey || !baseUrl || !model) {
            const gThis = globalThis as any;
            let importMetaEnv: any = null;
            try {
              importMetaEnv = (import.meta as any).env;
            } catch (e) {}

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
                  hasGlobalEnv: !!gThis.env,
                  globalEnvKeys: gThis.env ? Object.keys(gThis.env) : [],
                  hasImportMetaEnv: !!importMetaEnv,
                  importMetaEnvKeys: importMetaEnv ? Object.keys(importMetaEnv).filter(k => k.includes('NVIDIA') || k.includes('VITE')) : []
                }
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if (chatRequest.stream) {
            console.log('Initiating streaming request to NVIDIA');
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
              console.error('NVIDIA Streaming Error:', nvidiaResponse.status, errorText);
              throw new Error(`NVIDIA API error: ${nvidiaResponse.status} ${errorText}`);
            }

            console.log('NVIDIA Streaming response OK, proxying body');
            return new Response(nvidiaResponse.body, {
              headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
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
