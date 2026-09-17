import { twMerge } from 'tailwind-merge'
import clsx, { type ClassValue } from 'clsx'

export function cname(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
