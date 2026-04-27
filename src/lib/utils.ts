import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans quiz content from potential answer hints like asterisks or highlight tags.
 */
export function cleanQuizText(html: string): string {
  if (!html) return "";

  return (
    html
      // Remove mark tags but keep content
      .replace(/<mark[^>]*>(.*?)<\/mark>/gi, "$1")
      // Remove leading asterisks which are often used as correct answer markers
      .replace(/^\s*\*\s*/g, "")
      .trim()
  );
}

/**
 * Sanitizes HTML from DB before rendering via dangerouslySetInnerHTML.
 * Uses DOMPurify with a strict whitelist — blocks scripts, event handlers, etc.
 */
import DOMPurify from "dompurify";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "b", "i", "em", "strong", "u", "s", "sub", "sup",
    "p", "br", "hr", "div", "span",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "blockquote", "pre", "code",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel", "width", "height"],
  ALLOW_DATA_ATTR: false,
  RETURN_TRUSTED_TYPE: false as const,
};

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(cleanQuizText(html), PURIFY_CONFIG);
}

export function getAnonSecret(attemptId?: string): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("quizhub_anon_session_secret") ||
    (attemptId ? localStorage.getItem(`anon_secret_${attemptId}`) : null)
  );
}
