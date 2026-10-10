import type { CallLog } from '@/types';

const PATHS = [
  '/api/v1/hitokoto',
  '/api/v1/answerbook',
  '/api/v1/wallpaper',
  '/api/v1/hotsearch',
  '/api/v1/hotmusic',
  '/api/v1/hotplay',
  '/api/v1/hotchart',
  '/api/v1/emoji',
  '/api/v1/avatar',
  '/api/v1/images',
];

const IPS = [
  '203.0.113.24',
  '198.51.100.42',
  '192.0.2.18',
  '100.24.56.78',
  '172.16.254.1',
  '45.33.32.156',
  '104.16.89.22',
  '151.101.1.147',
];

const REGIONS = ['杭州', '北京', '上海', '深圳', '成都', '广州', '南京', '武汉'];

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148',
  'Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile',
  'PostmanRuntime/7.35.0',
  'curl/8.4.0',
];

function generateLogs(): CallLog[] {
  const logs: CallLog[] = [];
  const now = Date.now();

  for (let i = 0; i < 40; i++) {
    const status = i % 10 === 0 ? 500 : i % 7 === 0 ? 429 : i % 5 === 0 ? 404 : i % 3 === 0 ? 400 : 200;
    // noUncheckedIndexedAccess 使下标读出来是 T | undefined，这里用 ?? 兜默认值而不是断言
    const path = PATHS[i % PATHS.length] ?? PATHS[0] ?? '/api/v1/hitokoto';
    const ip = IPS[i % IPS.length] ?? IPS[0] ?? '0.0.0.0';
    const region = REGIONS[i % REGIONS.length] ?? REGIONS[0] ?? '未知';
    const ua = UAS[i % UAS.length] ?? UAS[0] ?? 'unknown';
    const cacheHit = i % 4 === 0;

    logs.push({
      id: `log_${String(i + 1).padStart(4, '0')}`,
      time: new Date(now - i * 180_000).toISOString(),
      path,
      method: 'GET',
      status,
      latencyMs: 30 + (i % 10) * 15,
      ip,
      region,
      caller: `key_${(i % 5) + 1}`,
      ua,
      cacheHit,
    });
  }

  return logs;
}

export const MOCK_LOGS: CallLog[] = generateLogs();

export function findAllLogs(): CallLog[] {
  return MOCK_LOGS;
}
