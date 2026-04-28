export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  user_id?: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  messageId?: string;
  sessionId?: string;
  message?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  context?: ChatContext;
  stream?: boolean;
}

export interface ChatContext {
  type: 'exam' | 'question' | 'general';
  examId?: string;
  questionId?: string;
  questionContent?: string;
  examTopic?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    messageId: string;
    sessionId: string;
  };
  error?: string;
}
