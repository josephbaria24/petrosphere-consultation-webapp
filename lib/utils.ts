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
