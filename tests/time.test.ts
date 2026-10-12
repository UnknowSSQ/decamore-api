/**
 * 墙上时间换 ISO 的用例。港股那条是拿原始字节定的：分隔符是 0x2F（斜杠），
 * 与美股的 0x2D（横杠）不同形，第一版按横杠写正则，港股的 quotedAt 就成了 null。
 * 斜杠一律写成转义，因为这个终端会把 / 显示成 -。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWallClock } from '@/lib/server/time';

const HK_SLASH = '2026\u002f10\u002f09 16:08:14';
const US_DASH = '2026\u002d10\u002d09 16:08:14';

describe('parseWallClock 三种上游形态', () => {
  it('A 股紧凑 14 位按东八区解', () => {
    assert.equal(parseWallClock('20261009161459', 'Asia/Shanghai'), '2026-10-09T08:14:59.000Z');
  });

  it('港股是斜杠日期，横杠斜杠都要认', () => {
    assert.equal(HK_SLASH.charCodeAt(4), 0x2f);
    assert.equal(US_DASH.charCodeAt(4), 0x2d);
    assert.equal(parseWallClock(HK_SLASH, 'Asia/Hong_Kong'), '2026-10-09T08:08:14.000Z');
    assert.equal(parseWallClock(US_DASH, 'Asia/Hong_Kong'), '2026-10-09T08:08:14.000Z');
  });

  it('美股跟着纽约的夏令时与冬令时换', () => {
    // 10 月是 EDT（UTC-4），1 月是 EST（UTC-5）
    assert.equal(parseWallClock('2026-10-09 16:00:01', 'America/New_York'), '2026-10-09T20:00:01.000Z');
    assert.equal(parseWallClock('2026-01-05 16:00:01', 'America/New_York'), '2026-01-05T21:00:01.000Z');
  });

  it('气象台只给到分钟，秒补 0', () => {
    assert.equal(parseWallClock('2026-10-11 20:21', 'Asia/Shanghai'), '2026-10-11T12:21:00.000Z');
  });

  it('前后空白不影响解析', () => {
    assert.equal(parseWallClock('  2026-10-11 20:21  ', 'Asia/Shanghai'), '2026-10-11T12:21:00.000Z');
  });

  it('形态不符、越界、未知时区都给 null，不猜', () => {
    for (const bad of ['', '   ', '2026-10-09', '2026/13/01 10:00:00', '2026-10-32 10:00:00', '20261009 16:14', '昨天 16:00']) {
      assert.equal(parseWallClock(bad, 'Asia/Shanghai'), null, `${bad} 应当解不出来`);
    }
    assert.equal(parseWallClock(US_DASH, 'Asia/Nowhere'), null);
  });
});
