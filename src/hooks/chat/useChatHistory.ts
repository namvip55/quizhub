import { useQuery } from "@tanstack/react-query";
import type { ChatMessage } from "@/types/chat.types";
import { chatService } from "@/services/chat/chat.service";

interface UseChatHistoryOptions {
  sessionId: string;
  enabled?: boolean;
}

/**
 * Hook for fetching chat message history with TanStack Query caching
 */
export function useChatHistory({ sessionId, enabled = true }: UseChatHistoryOptions) {
  return useQuery<ChatMessage[], Error>({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => chatService.getMessages(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
