import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function generateId(): string {
  // Use secure UUID when available to avoid accidental collisions when creating projects quickly
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    try {
      return (crypto as any).randomUUID();
    } catch {
      // fallthrough to fallback
    }
  }

  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
