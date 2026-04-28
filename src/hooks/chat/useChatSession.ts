import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatSession } from "@/types/chat.types";
import { chatService } from "@/services/chat/chat.service";
import { useAuth } from "@/lib/auth";

interface UseChatSessionOptions {
  initialSessionId?: string;
  autoCreate?: boolean;
}

interface UseChatSessionReturn {
  sessionId: string | null;
  session: ChatSession | null;
  isLoading: boolean;
  createSession: (title?: string) => Promise<ChatSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  userSessions: ChatSession[];
  isLoadingUserSessions: boolean;
}

/**
 * Hook for managing chat sessions (create, resume, delete)
 * Handles both authenticated users and anonymous guests
 */
export function useChatSession({
  initialSessionId,
  autoCreate = false,
}: UseChatSessionOptions = {}): UseChatSessionReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);

  // Fetch current session details
  const { data: session, isLoading } = useQuery<ChatSession | null, Error>({
    queryKey: ["chat-session", sessionId],
    queryFn: () => (sessionId ? chatService.getSession(sessionId) : Promise.resolve(null)),
    enabled: !!sessionId,
    staleTime: 60_000, // 1 minute
  });

  // Fetch all sessions for authenticated user
  const { data: userSessions = [], isLoading: isLoadingUserSessions } = useQuery<
    ChatSession[],
    Error
  >({
    queryKey: ["chat-sessions", user?.id],
    queryFn: () => (user?.id ? chatService.getUserSessions(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (title?: string) => {
      return chatService.createSession(user?.id, title);
    },
    onSuccess: (newSession) => {
      setSessionId(newSession.id);
      queryClient.setQueryData(["chat-session", newSession.id], newSession);

      // Update user sessions list if authenticated
      if (user?.id) {
        queryClient.setQueryData<ChatSession[]>(["chat-sessions", user.id], (old = []) => [
          newSession,
          ...old,
        ]);
      }
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionIdToDelete: string) => {
      return chatService.deleteSession(sessionIdToDelete);
    },
    onSuccess: (_, deletedSessionId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["chat-session", deletedSessionId] });
      queryClient.removeQueries({ queryKey: ["chat-messages", deletedSessionId] });

      // Update user sessions list
      if (user?.id) {
        queryClient.setQueryData<ChatSession[]>(["chat-sessions", user.id], (old = []) =>
          old.filter((s) => s.id !== deletedSessionId)
        );
      }

      // If current session was deleted, clear it
      if (sessionId === deletedSessionId) {
        setSessionId(null);
      }
    },
  });

  // Update session title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
      return chatService.updateSessionTitle(sessionId, title);
    },
    onSuccess: (_, { sessionId: updatedSessionId, title }) => {
      // Update session in cache
      queryClient.setQueryData<ChatSession>(["chat-session", updatedSessionId], (old) =>
        old ? { ...old, title, updated_at: new Date().toISOString() } : old
      );

      // Update in user sessions list
      if (user?.id) {
        queryClient.setQueryData<ChatSession[]>(["chat-sessions", user.id], (old = []) =>
          old.map((s) =>
            s.id === updatedSessionId
              ? { ...s, title, updated_at: new Date().toISOString() }
              : s
          )
        );
      }
    },
  });

  // Auto-create session if needed
  useEffect(() => {
    if (autoCreate && !sessionId && !isLoading && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [autoCreate, sessionId, isLoading, createSessionMutation]);

  // Store session ID in localStorage for anonymous users
  useEffect(() => {
    if (sessionId && !user?.id) {
      localStorage.setItem("quizhub_anon_chat_session", sessionId);
    }
  }, [sessionId, user?.id]);

  // Restore session ID from localStorage for anonymous users
  useEffect(() => {
    if (!sessionId && !user?.id && !initialSessionId) {
      const storedSessionId = localStorage.getItem("quizhub_anon_chat_session");
      if (storedSessionId) {
        setSessionId(storedSessionId);
      }
    }
  }, [sessionId, user?.id, initialSessionId]);

  const createSession = useCallback(
    async (title?: string) => {
      return createSessionMutation.mutateAsync(title);
    },
    [createSessionMutation]
  );

  const deleteSession = useCallback(
    async (sessionIdToDelete: string) => {
      return deleteSessionMutation.mutateAsync(sessionIdToDelete);
    },
    [deleteSessionMutation]
  );

  const updateSessionTitle = useCallback(
    async (sessionIdToUpdate: string, title: string) => {
      return updateTitleMutation.mutateAsync({ sessionId: sessionIdToUpdate, title });
    },
    [updateTitleMutation]
  );

  return {
    sessionId,
    session,
    isLoading,
    createSession,
    deleteSession,
    updateSessionTitle,
    userSessions,
    isLoadingUserSessions,
  };
}
