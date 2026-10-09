import type { NotificationItem } from '@/types';

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_001',
    title: '限流拦截上升',
    body: '规则「热点接口频控」今日拦截 429 占比 3.8%，较昨日上升 1.2pt。',
    time: '2026-10-07T02:05:00.000Z',
    tone: 'alert',
    read: false,
  },
  {
    id: 'notif_002',
    title: '新设备登录',
    body: '检测到来自 203.0.113.24（杭州 · Chrome）的管理员登录。',
    time: '2026-10-07T00:15:00.000Z',
    tone: 'default',
    read: false,
  },
  {
    id: 'notif_003',
    title: '例行维护排期',
    body: '10 月 9 日 02:00–02:40 进行数据库例检，接口将短暂降级。',
    time: '2026-10-06T18:20:00.000Z',
    tone: 'default',
    read: false,
  },
];

export function findAllNotifications(): NotificationItem[] {
  return MOCK_NOTIFICATIONS;
}

/** 直接改内存数组里的 read，重启即丢 */
export function markNotificationRead(id: string): void {
  const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
  if (notif) notif.read = true;
}
