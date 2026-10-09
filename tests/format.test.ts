import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatClock, formatDate, formatDateTime } from '../utils/format';

describe('站点时间与显示设置', () => {
  it('时区改变同一时刻的日期归属', () => {
    const utcMidnight = '2026-01-01T00:00:00Z';
    assert.equal(formatDate(utcMidnight, { timeZone: 'Asia/Tokyo' }), '2026-01-01');
    assert.equal(formatDate(utcMidnight, { timeZone: 'America/New_York' }), '2025-12-31');
  });

  it('日期格式三种写法各自成形', () => {
    const input = '2026-03-09T12:00:00Z';
    assert.equal(formatDate(input, { timeZone: 'UTC', dateFormat: 'iso' }), '2026-03-09');
    assert.equal(formatDate(input, { timeZone: 'UTC', dateFormat: 'cn' }), '2026年03月09日');
    assert.equal(formatDate(input, { timeZone: 'UTC', dateFormat: 'us' }), '03/09/2026');
  });

  it('日期时间用 24 小时制且跟随目标时区', () => {
    assert.equal(
      formatDateTime('2026-01-01T00:00:00Z', { timeZone: 'America/New_York' }),
      '2025-12-31 19:00:00',
    );
    assert.equal(formatClock(new Date('2026-01-01T00:00:00Z'), 'Asia/Tokyo'), '09:00:00');
  });

  it('时区名写错只丢时区，不抛错', () => {
    const input = '2026-01-01T00:00:00Z';
    assert.doesNotThrow(() => formatDate(input, { timeZone: 'Mars/Olympus' }));
    assert.equal(formatDate(input, { timeZone: 'Mars/Olympus' }), formatDate(input));
  });

  it('非法时间值仍回吐占位符', () => {
    assert.equal(formatDate('不是时间'), '--');
    assert.equal(formatDateTime('', { timeZone: 'UTC' }), '--');
  });
});
