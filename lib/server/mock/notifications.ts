import type { NotificationItem } from '@/types';

const seedNotifications = (): NotificationItem[] => [
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

/** 挂 globalThis：列表在 /notifications 这条 chunk 读、已读在 /notifications/[id]/read 那条写，模块级数组两边不是同一份 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreNotifications?: NotificationItem[];
};

const NOTIFICATIONS: NotificationItem[] = (globalStore.__decamoreNotifications ??= seedNotifications());

/** 交出副本，读侧的筛选与分页不会顺手改到单例 */
export function findAllNotifications(): NotificationItem[] {
  return NOTIFICATIONS.map((item) => ({ ...item }));
}

export function findNotification(id: string): NotificationItem | undefined {
  const notif = NOTIFICATIONS.find((n) => n.id === id);
  return notif ? { ...notif } : undefined;
}

export function markNotificationRead(id: string): number {
  const notif = NOTIFICATIONS.find((n) => n.id === id);
  if (!notif || notif.read) return 0;
  notif.read = true;
  return 1;
}

/** 返回本次真正翻成已读的条数，界面据此说话，不写死数字 */
export function markAllNotificationsRead(): number {
  let changed = 0;
  for (const notif of NOTIFICATIONS) {
    if (!notif.read) {
      notif.read = true;
      changed += 1;
    }
  }
  return changed;
}
