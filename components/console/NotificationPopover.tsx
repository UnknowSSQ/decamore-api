'use client';
import { useEffect, useState } from 'react';

import { useClickOutside, useHotkey } from '@/hooks/useUi';
import { useToast } from '@/hooks/useToast';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/api';
import type { NotificationItem } from '@/types';
import { cn } from '@/utils/cn';

/** 接口失败或返回空列表时用它兜底，免得弹层一片空白 */
const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: '限流拦截上升',
    body: '规则「热点接口频控」今日拦截 429 占比 3.8%，较昨日上升 1.2pt。',
    time: '10 分钟前',
    tone: 'alert',
    read: false,
  },
  {
    id: '2',
    title: '新设备登录',
    body: '检测到来自 203.0.113.24（杭州 · Chrome）的管理员登录。',
    time: '2 小时前',
    tone: 'default',
    read: false,
  },
  {
    id: '3',
    title: '例行维护排期',
    body: '10 月 9 日 02:00–02:40 进行数据库例检，接口将短暂降级。',
    time: '昨天 18:20',
    tone: 'default',
    read: false,
  },
];

export interface NotificationPopoverProps {
  onClose: () => void;
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(FALLBACK_NOTIFICATIONS);
  const toast = useToast();
  const ref = useClickOutside<HTMLDivElement>(onClose);
  useHotkey('Escape', onClose, { ignoreInputs: false });

  useEffect(() => {
    fetchNotifications()
      .then((res) => {
        // 空响应也保留常量，否则降级路径下弹层是空的
        if (res.items.length > 0) setNotifications(res.items);
      })
      .catch(() => {
        // 失败时保持降级常量
      });
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const { changed } = await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success(changed > 0 ? `${changed} 条通知已标记为已读` : '没有未读通知');
      onClose();
    } catch {
      toast.error('操作失败', '网络或服务端异常，请稍后重试');
    }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] animate-fade-in rounded-[18px] border border-line bg-surface shadow-pop"
      aria-label="通知列表"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-[13px] font-semibold text-ink">
          通知 · {notifications.length}
        </span>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="text-[11.5px] font-medium text-primary hover:underline"
        >
          全部已读
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex gap-2.5 border-b border-line px-4 py-3 last:border-b-0',
              item.tone === 'alert' && 'bg-danger-soft/40',
            )}
          >
            <span
              className={cn(
                'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                item.tone === 'alert' ? 'bg-danger' : 'bg-muted',
              )}
              aria-hidden
            />
            <div className="flex-1">
              <strong className="block text-[12.5px] font-semibold text-ink">{item.title}</strong>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.body}</p>
              <time className="mt-1 block text-[10px] text-muted">{item.time}</time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
