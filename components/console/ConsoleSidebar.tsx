'use client';
import Link from 'next/link';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ROUTES } from '@/constants/app';
import { cn } from '@/utils/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  badge?: number | string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/** 顶栏面包屑的当前视图名也从这份常量匹配出来；badge 是写死的展示值，不随数据变化 */
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
      { label: '接口管理', href: ROUTES.adminApis, icon: 'plug', badge: 16 },
      { label: '访问规则', href: ROUTES.adminRules, icon: 'list', badge: 6 },
      { label: '调用日志', href: ROUTES.adminLogs, icon: 'list' },
    ],
  },
  {
    group: '系统配置',
    items: [
      { label: '安全配置', href: ROUTES.adminSecurity, icon: 'shield', badge: 2 },
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
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                      isActive ? 'bg-white/20 text-white' : 'bg-sand text-muted',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
