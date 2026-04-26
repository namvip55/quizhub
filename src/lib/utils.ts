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
  
  return html
    // Remove mark tags but keep content
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, "$1")
    // Remove leading asterisks which are often used as correct answer markers
    .replace(/^\s*\*\s*/g, "")
    .trim();
}
