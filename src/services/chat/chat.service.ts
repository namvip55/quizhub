import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, ChatSession } from "@/types/chat.types";

export const chatService = {
  /**
   * Create a new chat session
   */
  createSession: async (userId?: string, title?: string): Promise<ChatSession> => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId || null,
        title: title || "New Chat",
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  },

  /**
   * Get a chat session by ID
   */
  getSession: async (sessionId: string): Promise<ChatSession | null> => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data as ChatSession;
  },

  /**
   * Get all sessions for a user (authenticated users only)
   */
  getUserSessions: async (userId: string): Promise<ChatSession[]> => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data as ChatSession[]) || [];
  },

  /**
   * Update session title
   */
  updateSessionTitle: async (sessionId: string, title: string): Promise<void> => {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) throw error;
  },

  /**
   * Delete a session and all its messages
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

    if (error) throw error;
  },

  /**
   * Get all messages for a session
   */
  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as ChatMessage[]) || [];
  },

  /**
   * Save a message to the database
   */
  saveMessage: async (
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
    userId?: string
  ): Promise<ChatMessage> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role,
        content,
        user_id: userId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update session's updated_at timestamp
    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return data as ChatMessage;
  },

  /**
   * Delete a specific message
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);

    if (error) throw error;
  },
};
