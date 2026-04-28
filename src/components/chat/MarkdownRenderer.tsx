import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with syntax-highlighted code blocks
 * Uses react-markdown + rehype-highlight + highlight.js
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom code block styling
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <code
                className={cn(
                  "block rounded-lg bg-muted p-4 text-sm overflow-x-auto",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom link styling
          a: ({ node, children, ...props }) => (
            <a
              className="text-primary underline underline-offset-4 hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Custom paragraph styling
          p: ({ node, children, ...props }) => (
            <p className="mb-4 last:mb-0 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Custom list styling
          ul: ({ node, children, ...props }) => (
            <ul className="mb-4 ml-6 list-disc space-y-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2" {...props}>
              {children}
            </ol>
          ),
          // Custom heading styling
          h1: ({ node, children, ...props }) => (
            <h1 className="mb-4 text-2xl font-bold" {...props}>
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className="mb-3 text-xl font-bold" {...props}>
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className="mb-2 text-lg font-semibold" {...props}>
              {children}
            </h3>
          ),
          // Custom blockquote styling
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
