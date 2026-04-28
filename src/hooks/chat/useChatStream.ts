import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage, ChatRequest, StreamChunk } from "@/types/chat.types";
import { chatService } from "@/services/chat/chat.service";

interface UseChatStreamOptions {
  sessionId: string;
  userId?: string;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface UseChatStreamReturn {
  sendMessage: (message: string, context?: ChatRequest["context"]) => Promise<void>;
  isStreaming: boolean;
  error: Error | null;
  abortStream: () => void;
}

/**
 * Hook for streaming chat messages with real-time TanStack Query cache updates
 */
export function useChatStream({
  sessionId,
  userId,
  onError,
  onComplete,
}: UseChatStreamOptions): UseChatStreamReturn {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mutation for saving messages to Supabase
  const saveMessageMutation = useMutation({
    mutationFn: async ({
      role,
      content,
    }: {
      role: ChatMessage["role"];
      content: string;
    }) => {
      return chatService.saveMessage(sessionId, role, content, userId);
    },
  });

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string, context?: ChatRequest["context"]) => {
      if (isStreaming) {
        console.warn("Already streaming, ignoring new message");
        return;
      }

      setIsStreaming(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // 1. Optimistically add user message to cache
        const tempUserId = `temp-user-${Date.now()}`;
        const optimisticUserMessage: ChatMessage = {
          id: tempUserId,
          session_id: sessionId,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
          user_id: userId,
        };

        queryClient.setQueryData<ChatMessage[]>(["chat-messages", sessionId], (old = []) => [
          ...old,
          optimisticUserMessage,
        ]);

        // 2. Save user message to database
        const savedUserMessage = await saveMessageMutation.mutateAsync({
          role: "user",
          content: message,
        });

        // Replace temp message with saved one
        queryClient.setQueryData<ChatMessage[]>(["chat-messages", sessionId], (old = []) =>
          old.map((msg) => (msg.id === tempUserId ? savedUserMessage : msg))
        );

        // 3. Call API endpoint for assistant response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            sessionId,
            userId,
            context,
            stream: true,
          } satisfies ChatRequest),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Server function failed: ${response.status}`);
        }

        // 4. Parse SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const tempAssistantId = `temp-assistant-${Date.now()}`;

        // Add empty assistant message to cache
        const optimisticAssistantMessage: ChatMessage = {
          id: tempAssistantId,
          session_id: sessionId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<ChatMessage[]>(["chat-messages", sessionId], (old = []) => [
          ...old,
          optimisticAssistantMessage,
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);

                // Extract content based on format (Custom vs OpenAI)
                let contentToAdd = "";
                let isDone = false;
                let isError = false;
                let errorMessage = "";

                if (parsed.type === "chunk" && parsed.content) {
                  contentToAdd = parsed.content;
                } else if (parsed.choices?.[0]?.delta?.content) {
                  contentToAdd = parsed.choices[0].delta.content;
                } else if (parsed.type === "done" || parsed.choices?.[0]?.finish_reason === "stop") {
                  isDone = true;
                } else if (parsed.type === "error" || parsed.error) {
                  isError = true;
                  errorMessage = parsed.message || parsed.error?.message || "Stream error";
                }

                if (contentToAdd) {
                  assistantContent += contentToAdd;

                  // Update cache with new content
                  queryClient.setQueryData<ChatMessage[]>(
                    ["chat-messages", sessionId],
                    (old = []) =>
                      old.map((msg) =>
                        msg.id === tempAssistantId
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                  );
                } else if (isDone) {
                  // Stream complete, save assistant message to database
                  const savedAssistantMessage = await saveMessageMutation.mutateAsync({
                    role: "assistant",
                    content: assistantContent,
                  });

                  // Replace temp message with saved one
                  queryClient.setQueryData<ChatMessage[]>(
                    ["chat-messages", sessionId],
                    (old = []) =>
                      old.map((msg) =>
                        msg.id === tempAssistantId ? savedAssistantMessage : msg
                      )
                  );

                  onComplete?.();
                } else if (isError) {
                  throw new Error(errorMessage);
                }
              } catch (parseError) {
                console.error("Failed to parse SSE chunk:", parseError);
              }
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");

        // Don't treat abort as an error
        if (error.name === "AbortError") {
          console.log("Stream aborted by user");
          return;
        }

        setError(error);
        onError?.(error);

        // Remove optimistic messages on error
        queryClient.setQueryData<ChatMessage[]>(["chat-messages", sessionId], (old = []) =>
          old.filter((msg) => !msg.id.startsWith("temp-"))
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, sessionId, userId, queryClient, saveMessageMutation, onError, onComplete]
  );

  return {
    sendMessage,
    isStreaming,
    error,
    abortStream,
  };
}
