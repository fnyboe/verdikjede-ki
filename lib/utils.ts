import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStratKey(vc: string, tech: string): string {
  if (vc === 'low'  && tech === 'few')  return 'focused'
  if (vc === 'low'  && tech === 'many') return 'collaborative'
  if (vc === 'high' && tech === 'few')  return 'vertical'
  return 'platform'
}
