'use client';
import type { Route } from 'next';
import Link from 'next/link';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ROUTES } from '@/constants/app';
import { cn } from '@/utils/cn';

export interface NavItem {
  label: string;
  href: Route;
  icon: IconName;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/** 顶栏面包屑的当前视图名也从这份常量匹配出来。计数徽章已移除：写死的数字（16/6/2）与实际条数无关 */
export const CONSOLE_NAV: NavGroup[] = [
  {
    group: '总览',
    items: [
      { label: '仪表盘', href: ROUTES.adminDashboard, icon: 'grid' },
    ],
  },
  {
    group: '资源管理',
    items: [
      { label: '接口管理', href: ROUTES.adminApis, icon: 'plug' },
      { label: '访问规则', href: ROUTES.adminRules, icon: 'list' },
      { label: '调用日志', href: ROUTES.adminLogs, icon: 'list' },
    ],
  },
  {
    group: '系统配置',
    items: [
      { label: '安全配置', href: ROUTES.adminSecurity, icon: 'shield' },
      { label: '网站设置', href: ROUTES.adminSettings, icon: 'sliders' },
    ],
  },
];

export interface ConsoleSidebarProps {
  pathname: string;
}

export function ConsoleSidebar({ pathname }: ConsoleSidebarProps) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {CONSOLE_NAV.map((group) => (
        <div key={group.group} className="mb-4">
          <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            {group.group}
          </p>
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-ink hover:bg-bg-soft hover:text-primary',
                )}
              >
                <Icon name={item.icon} size={16} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
