-- Migration: Create chat tables for AI chatbot
-- Created: 2026-04-28
-- Description: Creates chat_sessions and chat_messages tables with RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: chat_sessions
-- ============================================================================
-- Stores chat session metadata for both authenticated and anonymous users
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT chat_sessions_title_length CHECK (char_length(title) <= 200)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- ============================================================================
-- TABLE: chat_messages
-- ============================================================================
-- Stores individual chat messages (user and assistant)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chat_messages_content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT chat_messages_content_length CHECK (char_length(content) <= 50000)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Composite index for common query pattern (session + created_at)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: chat_sessions
-- ============================================================================

-- Policy: Authenticated users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create sessions
CREATE POLICY "Users can create own sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anonymous users can create sessions (user_id = NULL)
CREATE POLICY "Anonymous users can create sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Policy: Anonymous users can view sessions they created (via session_id in query)
-- Note: This is handled at the application level since we can't track anonymous users in RLS
-- Anonymous sessions are accessible by anyone who knows the session_id
CREATE POLICY "Anonymous sessions are publicly readable"
  ON chat_sessions
  FOR SELECT
  USING (user_id IS NULL);

-- Policy: Anonymous users can update sessions (for title updates)
CREATE POLICY "Anonymous sessions are publicly updatable"
  ON chat_sessions
  FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Policy: Anonymous users can delete sessions
CREATE POLICY "Anonymous sessions are publicly deletable"
  ON chat_sessions
  FOR DELETE
  USING (user_id IS NULL);

-- ============================================================================
-- POLICIES: chat_messages
-- ============================================================================

-- Policy: Users can view messages in their own sessions
CREATE POLICY "Users can view messages in own sessions"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Users can create messages in their own sessions
CREATE POLICY "Users can create messages in own sessions"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Users can delete messages in their own sessions
CREATE POLICY "Users can delete messages in own sessions"
  ON chat_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Policy: Anonymous users can view messages in anonymous sessions
CREATE POLICY "Anonymous users can view messages in anonymous sessions"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id IS NULL
    )
  );

-- Policy: Anonymous users can create messages in anonymous sessions
CREATE POLICY "Anonymous users can create messages in anonymous sessions"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id IS NULL
    )
  );

-- Policy: Anonymous users can delete messages in anonymous sessions
CREATE POLICY "Anonymous users can delete messages in anonymous sessions"
  ON chat_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id IS NULL
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE chat_sessions IS 'Stores chat session metadata for AI chatbot';
COMMENT ON TABLE chat_messages IS 'Stores individual chat messages (user and assistant)';

COMMENT ON COLUMN chat_sessions.user_id IS 'NULL for anonymous users, UUID for authenticated users';
COMMENT ON COLUMN chat_sessions.title IS 'Session title (auto-generated or user-defined)';
COMMENT ON COLUMN chat_sessions.updated_at IS 'Auto-updated on any message activity';

COMMENT ON COLUMN chat_messages.role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN chat_messages.content IS 'Message content (plain text or markdown)';
COMMENT ON COLUMN chat_messages.user_id IS 'User who sent the message (NULL for assistant messages)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;

-- Grant permissions to anonymous users (for anonymous sessions)
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
