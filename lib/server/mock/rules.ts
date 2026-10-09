import type { AccessRule } from '@/types';

export const MOCK_RULES: AccessRule[] = [
  {
    id: 'rule_001',
    name: '热点接口频控',
    scope: 'global',
    limit: 100,
    periodSec: 60,
    action: '429',
    enabled: true,
    hitsToday: 342,
    updatedAt: '2026-10-07T01:00:00.000Z',
  },
  {
    id: 'rule_002',
    name: '恶意 IP 拦截',
    scope: 'global',
    limit: 500,
    periodSec: 300,
    action: 'reject',
    enabled: true,
    hitsToday: 28,
    updatedAt: '2026-10-06T22:30:00.000Z',
  },
  {
    id: 'rule_003',
    name: '异常流量验证码',
    scope: '/api/v1/*',
    limit: 200,
    periodSec: 120,
    action: 'captcha',
    enabled: true,
    hitsToday: 156,
    updatedAt: '2026-10-06T18:00:00.000Z',
  },
  {
    id: 'rule_004',
    name: '日志记录（调试）',
    scope: '/api/v1/admin/*',
    limit: 1000,
    periodSec: 60,
    action: 'log',
    enabled: false,
    hitsToday: 0,
    updatedAt: '2026-10-05T14:20:00.000Z',
  },
  {
    id: 'rule_005',
    name: '登录接口保护',
    scope: '/api/v1/auth/login',
    limit: 10,
    periodSec: 60,
    action: '429',
    enabled: true,
    hitsToday: 89,
    updatedAt: '2026-10-07T00:45:00.000Z',
  },
  {
    id: 'rule_006',
    name: '图片接口限流',
    scope: '/api/v1/wallpaper',
    limit: 60,
    periodSec: 60,
    action: '429',
    enabled: true,
    hitsToday: 412,
    updatedAt: '2026-10-06T20:15:00.000Z',
  },
  {
    id: 'rule_007',
    name: '榜单类接口保护',
    scope: '/api/v1/hotsearch,/api/v1/hotmusic,/api/v1/hotplay,/api/v1/hotchart',
    limit: 30,
    periodSec: 60,
    action: 'captcha',
    enabled: true,
    hitsToday: 67,
    updatedAt: '2026-10-06T16:30:00.000Z',
  },
  {
    id: 'rule_008',
    name: '全局兜底策略',
    scope: 'global',
    limit: 5000,
    periodSec: 3600,
    action: '429',
    enabled: true,
    hitsToday: 12,
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
];

export function findAllRules(): AccessRule[] {
  return MOCK_RULES;
}

export function findRuleById(id: string): AccessRule | undefined {
  return MOCK_RULES.find((r) => r.id === id);
}
