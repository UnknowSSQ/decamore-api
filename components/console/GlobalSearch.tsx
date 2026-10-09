'use client';
/** 不持有任何状态：父组件只需要这个 DOM ref 来响应 / 快捷键 */
import { forwardRef } from 'react';

import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Tooltip';

export const GlobalSearch = forwardRef<HTMLInputElement>(function GlobalSearch(_props, ref) {
  return (
    <div
      className="relative flex items-center max-lg:hidden"
      role="search"
    >
      <Icon
        name="search"
        size={14}
        className="pointer-events-none absolute left-3 text-muted"
      />
      <input
        ref={ref}
        type="search"
        placeholder="搜索接口、路径或 IP…"
        aria-label="全局搜索"
        className="h-9 w-[220px] rounded-full border border-line bg-surface pl-9 pr-8 font-sans text-[12.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <Kbd className="pointer-events-none absolute right-2.5">/</Kbd>
    </div>
  );
});
