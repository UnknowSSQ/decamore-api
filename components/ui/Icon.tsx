'use client';
/** 只收录页面里真实用到的图形；新图标在这里追加，别再各处内联 <svg> */
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export type IconName =
  | 'search'
  | 'eye'
  | 'eye-off'
  | 'list'
  | 'plus'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-up-right'
  | 'copy'
  | 'check'
  | 'download'
  | 'warning'
  | 'info'
  | 'bell'
  | 'logout'
  | 'menu'
  | 'grid'
  | 'plug'
  | 'shield'
  | 'sliders'
  | 'refresh'
  | 'external'
  | 'trash'
  | 'edit'
  | 'mail';

/** 描边 + currentColor，别再传颜色 props，也不需要按主题维护两套 path */
const GLYPHS: Record<IconName, ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  eye: <><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></>,
  'eye-off': <><path d="M4 4.5 20 20" /><path d="M9.6 9.7A9.9 9.9 0 0 0 2.5 12s3.6 6 9.5 6c1.5 0 2.9-.3 4.1-.8" /><path d="M14.2 14.3a6.6 6.6 0 0 0 .3-2.4 2.6 2.6 0 0 0-3.5-2.4" /></>,
  list: <><path d="M8 7h12M8 12h12M8 17h12" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  close: <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />,
  'chevron-down': <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  'chevron-right': <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  'arrow-right': <path d="M4.5 12h14M13 6.5 18.5 12 13 17.5" />,
  'arrow-up': <path d="M12 19V5.5M6.5 11 12 5.5 17.5 11" />,
  'arrow-up-right': <path d="M7 17 17 7M8.5 7H17v8.5" />,
  copy: <><rect x="9" y="9" width="10.5" height="10.5" rx="2.5" /><path d="M15 6.5V6a2 2 0 0 0-2-2H6.5a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h.5" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4.5 7.5 7.5 5.5 7.5-5.5" /></>,
  check: <path d="m5.5 12.5 4 4 9-9" />,
  download: <><path d="M12 4.5v10M8 11l4 4 4-4" /><path d="M5 19h14" /></>,
  warning: <><path d="M12 4.6 21 19H3l9-14.4Z" /><path d="M12 10v4M12 16.6h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 8h.01" /></>,
  bell: <><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" /><path d="M10 18.5a2.2 2.2 0 0 0 4 0" /></>,
  logout: <><path d="M15 5.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3" /><path d="M10 8.5 6.5 12 10 15.5M6.5 12h9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  plug: <><path d="M9 4.5v4M15 4.5v4" /><path d="M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z" /><path d="M12 17v2.5" /></>,
  shield: <><path d="M12 4 19 6.5v5c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5v-5L12 4Z" /><path d="m9 12 2 2 4-4" /></>,
  sliders: <><path d="M4 8h10M18 8h2M4 16h4M12 16h8" /><circle cx="16" cy="8" r="2" /><circle cx="10" cy="16" r="2" /></>,
  refresh: <><path d="M19 12a7 7 0 1 1-2.4-5.3" /><path d="M19.5 4.5V9H15" /></>,
  external: <><path d="M13.5 5.5H19V11" /><path d="M19 5.5 11 13.5" /><path d="M18 14.5v3.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3.5" /></>,
  trash: <><path d="M5 7.5h14M9.5 7.5V5.5h5v2" /><path d="M7 7.5 8 20h8l1-12.5" /></>,
  edit: <><path d="M4.5 19.5h4L19 9a2.5 2.5 0 0 0-3.5-3.5L5 16v3.5Z" /><path d="m14.5 6.5 3 3" /></>,
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  const glyph = GLYPHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // 图标本身一律对读屏隐藏；纯图标按钮的语义由按钮自己的 aria-label 承担
      aria-hidden
      className={cn('shrink-0', className)}
    >
      {glyph}
    </svg>
  );
}
