'use client';
import Link from 'next/link';

import { Icon } from '@/components/ui/Icon';
import { useClickOutside, useHotkey } from '@/hooks/useUi';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/app';
import type { AuthUser } from '@/types';

interface UserPopoverProps {
  user: AuthUser;
  onClose: () => void;
}

export function UserPopover({ user, onClose }: UserPopoverProps) {
  const { signOut } = useAuth();
  const ref = useClickOutside<HTMLDivElement>(onClose);

  // ignoreInputs=false：焦点在弹层外的搜索框里时 Esc 也该关掉弹层
  useHotkey('Escape', onClose, { ignoreInputs: false });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] animate-fade-in rounded-[18px] border border-line bg-surface shadow-pop"
    >
      <div className="border-b border-line px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">{user.email}</p>
        <p className="mt-0.5 text-[11px] text-muted">{user.role}</p>
      </div>
      <div className="py-2">
        <Link
          href={ROUTES.docs}
          onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-ink transition-colors hover:bg-bg-soft"
        >
          <Icon name="external" size={14} />
          查看公开文档 ↗
        </Link>
        <Link
          href={ROUTES.adminSecurity}
          onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-ink transition-colors hover:bg-bg-soft"
        >
          <Icon name="shield" size={14} />
          安全与登录
        </Link>
        <Link
          href={ROUTES.adminSettings}
          onClick={onClose}
          className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-ink transition-colors hover:bg-bg-soft"
        >
          <Icon name="sliders" size={14} />
          偏好设置
        </Link>
      </div>
      <div className="border-t border-line py-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-[12.5px] text-danger transition-colors hover:bg-danger-soft/40"
        >
          <Icon name="logout" size={14} />
          退出登录
        </button>
      </div>
    </div>
  );
}
