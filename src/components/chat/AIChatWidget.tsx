import { useEffect, useRef, useState } from "react";
import { X, MessageSquare, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChatSession, useChatHistory, useChatStream } from "@/hooks/chat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useAuth } from "@/lib/auth";
import type { ChatRequest } from "@/types/chat.types";

interface AIChatWidgetProps {
  context?: ChatRequest["context"];
  className?: string;
}

/**
 * Main AI Chat Widget - Floating on desktop, full-screen on mobile
 * Supports both authenticated and anonymous users
 */
export function AIChatWidget({ context, className }: AIChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session management
  const { sessionId, createSession } = useChatSession({ autoCreate: true });

  // Fetch message history
  const { data: messages = [], isLoading } = useChatHistory({
    sessionId: sessionId!,
    enabled: !!sessionId,
  });

  // Streaming
  const { sendMessage, isStreaming, error } = useChatStream({
    sessionId: sessionId!,
    userId: user?.id,
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Handle send message
  const handleSend = async (message: string) => {
    if (!sessionId) {
      await createSession();
    }
    await sendMessage(message, context);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Launcher button (when closed)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
          "transition-all duration-300 hover:scale-110",
          className
        )}
        aria-label="Open AI Chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <>
      {/* Mobile: Full-screen modal */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background",
          "md:hidden",
          "animate-in slide-in-from-bottom duration-300"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">Start a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Ask me anything about your exams, questions, or general topics!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id.startsWith("temp-assistant")}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Error message */}
        {error && (
          <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming || !sessionId} />
      </div>

      {/* Desktop: Floating widget */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 hidden flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
          "md:flex",
          "animate-in slide-in-from-bottom-4 duration-300",
          isMinimized ? "h-14 w-80" : "h-[600px] w-[400px]",
          "transition-all duration-300",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content (hidden when minimized) */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about your exams, questions, or general topics!
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreaming && msg.id.startsWith("temp-assistant")}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Error message */}
            {error && (
              <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error.message}
              </div>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={isStreaming || !sessionId} />
          </>
        )}
      </div>
    </>
  );
}
