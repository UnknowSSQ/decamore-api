import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** tailwind-merge 消掉冲突类（p-2 p-4 只留后者），调用方才能覆盖组件默认样式，variant 体系靠这个 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
