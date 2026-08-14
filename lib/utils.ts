/**
 * File: lib/utils.ts
 * Description: Utility functions library.
 * Contains shared helper logic for styling and formatting.
 * Functions:
 * - cn(...inputs): Utility for merging Tailwind classes efficiently.
 * Connections:
 * - Imported by most UI components to handle dynamic styling.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Tremor-compatible alias for `cn`. */
export function cx(...inputs: ClassValue[]) {
  return cn(...inputs)
}

/** Tremor Raw focus-visible ring utility classes. */
export const focusRing =
  "outline outline-offset-2 outline-0 focus-visible:outline-2 outline-blue-500 dark:outline-blue-500"