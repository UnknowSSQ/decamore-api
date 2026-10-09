import Link from 'next/link';

import { APP_NAME } from '@/constants/app';
import { cn } from '@/utils/cn';

const MARK_SIZE = {
  sm: { box: 'h-[26px] w-[26px] text-[15px]', gap: 'gap-2', text: 'text-[15px]' },
  md: { box: 'h-[31px] w-[31px] text-[18px]', gap: 'gap-[11px]', text: 'text-[17px]' },
  lg: { box: 'h-[38px] w-[38px] text-[22px]', gap: 'gap-3', text: 'text-[19px]' },
} as const;

export function BrandMark({ size = 'md', className }: { size?: keyof typeof MARK_SIZE; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center bg-primary font-serif italic text-[#fffefa]',
        MARK_SIZE[size].box,
        className,
      )}
      // 右下角的锐角是识别形状，不是笔误
      style={{ borderRadius: size === 'sm' ? '50% 50% 50% 6px' : '50% 50% 50% 8px' }}
    >
      D
    </span>
  );
}

export function Brand({
  href = '/',
  size = 'md',
  label = APP_NAME,
  ariaLabel,
  className,
}: {
  href?: string;
  size?: keyof typeof MARK_SIZE;
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? `${label} 首页`}
      className={cn('inline-flex items-center font-semibold tracking-[0.04em] text-ink transition-colors hover:text-primary', MARK_SIZE[size].gap, className)}
    >
      <BrandMark size={size} />
      <span className={MARK_SIZE[size].text}>{label}</span>
    </Link>
  );
}
