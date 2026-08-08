import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Classname helper used by Aceternity-style UI ports. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
