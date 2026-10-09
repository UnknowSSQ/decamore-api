'use client';
/** 侧栏在 ≤960px 转为 fixed 抽屉，主区宽度由 grid 列数兜底 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandMark } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { ConsoleSidebar } from './ConsoleSidebar';
import { ConsoleTopbar } from './ConsoleTopbar';
import { MaintenanceBanner } from './MaintenanceBanner';
import { CONSOLE_REGION, CONSOLE_VERSION, ROUTES } from '@/constants/app';
import type { AuthUser } from '@/types';
import { cn } from '@/utils/cn';

export interface ConsoleShellProps {
  user: AuthUser;
  children: ReactNode;
}

export function ConsoleShell({ user, children }: ConsoleShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // 否则换页后抽屉仍挡在内容上
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // 记下原值再还原，直接清空会覆盖别人加的滚动锁
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [navOpen]);

  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div
      ref={consoleRef}
      // 缺省仍保留 252px 那一列，抽屉态下会把主区挤窄
      className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)] max-lg:grid-cols-1"
    >
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-line bg-surface',
          'max-lg:fixed max-lg:z-[70] max-lg:w-[min(288px,86vw)] max-lg:shadow-lift',
          'max-lg:transition-transform max-lg:duration-[450ms] max-lg:ease-dec',
          navOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
        aria-label="控制台导航"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-[11px] font-semibold tracking-[0.04em] text-ink transition-colors hover:text-primary"
            aria-label="Decamore API 首页"
          >
            <BrandMark size="md" />
            <span className="flex flex-col">
              <span className="text-[17px]">Decamore API</span>
              <small className="text-[10.5px] font-normal text-muted">Admin Console</small>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeNav}
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary hover:text-primary lg:hidden"
            aria-label="关闭导航"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <ConsoleSidebar pathname={pathname} />

        <div className="mt-auto border-t border-line px-5 py-4">
          <div className="flex items-center gap-2.5 text-[11.5px]" role="status">
            <span className="pulse-dot" aria-hidden />
            <div className="flex flex-col">
              <strong className="text-[12px] font-semibold text-ink">全部系统运行正常</strong>
              <span className="text-[10.5px] text-muted">最近 90 天可用性 99.97%</span>
            </div>
          </div>
          <span className="mt-2 block font-mono text-[10px] text-muted">
            {CONSOLE_VERSION} · region {CONSOLE_REGION}
          </span>
        </div>
      </aside>

      {navOpen && (
        <div
          className="fixed inset-0 z-[60] animate-fade-in bg-[#202621]/30 backdrop-blur-[2px] lg:hidden"
          onClick={closeNav}
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-col bg-bg">
        <ConsoleTopbar user={user} onOpenNav={openNav} />
        <MaintenanceBanner />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] px-[34px] py-[30px] max-lg:px-5 max-lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
