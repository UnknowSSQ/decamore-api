import 'server-only';
import type { AccessRule } from '@/types';
import type { CreateRuleInput } from '@/lib/zod/admin.schema';
import { scopeMatches, scopeSpecificity } from '@/utils/net';

/**
 * hitsToday 一律从 0 起：由 recordRuleHit 真实累加，种子再放演示数字就分不出真假。
 * 除登录保护外都默认停用——规则现在真的会拦，启用比文档口径（120 次/分/IP）更严的种子规则会让线上限额凭空变低。
 */
const seedRules = (): AccessRule[] => [
  { id: 'rule_001', name: '热点接口频控', scope: 'global', limit: 100, periodSec: 60, action: '429', enabled: false, hitsToday: 0, updatedAt: '2026-10-07T01:00:00.000Z' },
  { id: 'rule_002', name: '恶意 IP 拦截', scope: 'global', limit: 500, periodSec: 300, action: 'reject', enabled: false, hitsToday: 0, updatedAt: '2026-10-06T22:30:00.000Z' },
  { id: 'rule_003', name: '异常流量验证码', scope: '/api/v1/*', limit: 200, periodSec: 120, action: 'captcha', enabled: false, hitsToday: 0, updatedAt: '2026-10-06T18:00:00.000Z' },
  { id: 'rule_004', name: '日志记录（调试）', scope: '/api/v1/admin/*', limit: 1000, periodSec: 60, action: 'log', enabled: false, hitsToday: 0, updatedAt: '2026-10-05T14:20:00.000Z' },
  { id: 'rule_005', name: '登录接口保护', scope: '/api/v1/auth/login', limit: 10, periodSec: 60, action: '429', enabled: true, hitsToday: 0, updatedAt: '2026-10-07T00:45:00.000Z' },
  { id: 'rule_006', name: '图片接口限流', scope: '/api/v1/wallpaper', limit: 60, periodSec: 60, action: '429', enabled: false, hitsToday: 0, updatedAt: '2026-10-06T20:15:00.000Z' },
  { id: 'rule_007', name: '榜单类接口保护', scope: '/api/v1/hotsearch,/api/v1/hotmusic,/api/v1/hotplay,/api/v1/hotchart', limit: 30, periodSec: 60, action: 'captcha', enabled: false, hitsToday: 0, updatedAt: '2026-10-06T16:30:00.000Z' },
  { id: 'rule_008', name: '全局兜底策略', scope: 'global', limit: 5000, periodSec: 3600, action: '429', enabled: false, hitsToday: 0, updatedAt: '2026-10-01T10:00:00.000Z' },
];

/** 挂 globalThis：规则读在守卫所在的每个 chunk、写在 /rules 那条 chunk，模块级数组存不住编辑结果 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreRules?: AccessRule[];
  __decamoreRulesSeed?: string;
  /** 规则 id -> 记账日，用来把 hitsToday 变成真计数 */
  __decamoreRuleHitDays?: Map<string, string>;
};

/** 种子内容或计数口径变更时 bump，进程内的编辑结果会被覆盖 */
const RULES_SEED_VERSION = '2026-10-09.enforced-by-guard-seed-disabled';

if (globalStore.__decamoreRulesSeed !== RULES_SEED_VERSION) {
  globalStore.__decamoreRulesSeed = RULES_SEED_VERSION;
  globalStore.__decamoreRules = seedRules();
  globalStore.__decamoreRuleHitDays = new Map();
}

const RULES: AccessRule[] = globalStore.__decamoreRules!;
const hitDays = (globalStore.__decamoreRuleHitDays ??= new Map<string, string>());

const nowIso = () => new Date().toISOString();

function nextRuleId(): string {
  let n = RULES.length + 1;
  while (RULES.some((rule) => rule.id === `rule_${String(n).padStart(3, '0')}`)) n += 1;
  return `rule_${String(n).padStart(3, '0')}`;
}

export function findAllRules(): AccessRule[] {
  return RULES.map((rule) => ({ ...rule }));
}

export function findRuleById(id: string): AccessRule | undefined {
  const rule = RULES.find((r) => r.id === id);
  return rule ? { ...rule } : undefined;
}

/** 启用且作用域命中该路径的规则，作用域越具体的排越前 */
export function rulesForPath(pathname: string): AccessRule[] {
  return RULES.filter((rule) => rule.enabled && scopeMatches(rule.scope, pathname)).sort(
    (a, b) => scopeSpecificity(b.scope) - scopeSpecificity(a.scope),
  );
}

export function createRule(input: CreateRuleInput): AccessRule {
  const rule: AccessRule = {
    id: nextRuleId(),
    name: input.name,
    scope: input.scope,
    limit: input.limit,
    periodSec: input.periodSec,
    action: input.action,
    enabled: input.enabled,
    hitsToday: 0,
    updatedAt: nowIso(),
  };
  RULES.push(rule);
  return { ...rule };
}

export function updateRule(id: string, patch: Partial<Omit<AccessRule, 'id' | 'hitsToday'>>): AccessRule | undefined {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) return undefined;
  Object.assign(rule, patch, { updatedAt: nowIso() });
  return { ...rule };
}

export function deleteRule(id: string): boolean {
  const index = RULES.findIndex((r) => r.id === id);
  if (index < 0) return false;
  RULES.splice(index, 1);
  hitDays.delete(id);
  return true;
}

/** 只在真的触发处置时计数；跨过 UTC 零点归零，免得 hitsToday 成了只增不减的装饰值 */
export function recordRuleHit(id: string): void {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) return;
  const day = String(Math.floor(Date.now() / 86_400_000));
  if (hitDays.get(id) !== day) rule.hitsToday = 0;
  rule.hitsToday += 1;
  hitDays.set(id, day);
}
