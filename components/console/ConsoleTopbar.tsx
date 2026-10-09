'use client';
import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ui/Icon';
import { ConsoleClock } from './ConsoleClock';
import { NotificationPopover } from './NotificationPopover';
import { UserPopover } from './UserPopover';
import { GlobalSearch } from './GlobalSearch';
import { useHotkey } from '@/hooks/useUi';
import { CONSOLE_NAV } from './ConsoleSidebar';
import type { AuthUser } from '@/types';

export interface ConsoleTopbarProps {
  user: AuthUser;
  /** 抽屉开合归 ConsoleShell，按钮要如实报出它的状态 */
  navOpen: boolean;
  onOpenNav: () => void;
}

/** 匹配不到导航项（非控制台路由）时兜底，面包屑不会出现空白段 */
function getViewLabel(pathname: string): string {
  for (const group of CONSOLE_NAV) {
    for (const item of group.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return '仪表盘';
}

export function ConsoleTopbar({ user, navOpen, onOpenNav }: ConsoleTopbarProps) {
  const pathname = usePathname();
  const viewLabel = getViewLabel(pathname);
  const searchRef = useRef<HTMLInputElement>(null);

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // 与 GlobalSearch 右侧的 Kbd 提示对应
  useHotkey('/', () => {
    searchRef.current?.focus();
  });

  const closeBell = useCallback(() => setBellOpen(false), []);
  const closeUser = useCallback(() => setUserOpen(false), []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-[14px]">
      <div className="flex h-[64px] items-center gap-4 px-6 max-lg:px-4">
        <button
          type="button"
          onClick={onOpenNav}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary hover:text-primary lg:hidden"
          aria-label="打开导航菜单"
          aria-expanded={navOpen}
        >
          <Icon name="menu" size={18} />
        </button>

        <p className="flex items-center gap-2 text-[13px] text-muted">
          <span className="max-sm:hidden">控制台</span>
          <span className="text-muted/60" aria-hidden>
            /
          </span>
          <b className="font-semibold text-ink">{viewLabel}</b>
        </p>

        <div className="ml-auto flex items-center gap-3">
          <GlobalSearch ref={searchRef} />

          <ConsoleClock />

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                // 两个弹层互斥，否则会同时挂在屏幕上
                setBellOpen((v) => !v);
                setUserOpen(false);
              }}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary hover:text-primary"
              aria-label="通知"
              aria-expanded={bellOpen}
            >
              <Icon name="bell" size={16} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
            </button>
            {bellOpen && <NotificationPopover onClose={closeBell} />}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserOpen((v) => !v);
                setBellOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1 transition-colors hover:border-primary"
              aria-label="用户菜单"
              aria-expanded={userOpen}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary font-serif italic text-[13px] text-surface">
                {user.avatarLetter}
              </span>
              <span className="hidden text-[12.5px] font-medium text-ink sm:inline">{user.name}</span>
            </button>
            {userOpen && <UserPopover user={user} onClose={closeUser} />}
          </div>
        </div>
      </div>
    </header>
  );
}
