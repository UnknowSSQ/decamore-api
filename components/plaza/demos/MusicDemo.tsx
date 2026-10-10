'use client';
/** 平台由 seed 取模得出，首帧 seed=0 恒为 QQ 音乐，SSR 与水合才算得出同一个值 */
import { useEffect, useState } from 'react';

import { fetchHotMusic } from '@/lib/api';
import type { HotMusicPlatform, HotMusicResult } from '@/types';
import type { DemoProps } from './types';

const SHOW_ROWS = 6;

const PLATFORM_ORDER: readonly HotMusicPlatform[] = ['qq', 'netease', 'kugou'];
const PLATFORM_NAME: Record<HotMusicPlatform, string> = {
  qq: 'QQ音乐',
  netease: '网易云',
  kugou: '酷狗',
};

/** 秒 → 3:41；上游没给时长时留空 */
function mmss(sec: number | null): string {
  if (sec === null || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** QQ 的上游只给到日期，换算后本地恒为 00:00 —— 这种情况只显示日期，不假装知道时刻 */
function updatedStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (clock(iso) === '00:00') {
    return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-')} 更新`;
  }
  return `${clock(iso)} 更新`;
}

export function MusicDemo({ seed }: DemoProps) {
  const [chart, setChart] = useState<HotMusicResult | null>(null);
  const [failed, setFailed] = useState(false);
  const platform = PLATFORM_ORDER[seed % PLATFORM_ORDER.length] as HotMusicPlatform;

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧榜单覆盖新榜单
    let ignore = false;
    void (async () => {
      try {
        const next = await fetchHotMusic(platform, SHOW_ROWS);
        if (!ignore) {
          setChart(next);
          setFailed(false);
        }
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [platform, seed]);

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {chart
          ? `${PLATFORM_NAME[chart.platform]} ${chart.chartName} · ${updatedStamp(chart.updatedAt)}${chart.cached ? '（缓存）' : ''}`
          : failed
            ? PLATFORM_NAME[platform]
            : `正在取${PLATFORM_NAME[platform]}榜…`}
      </div>

      {chart &&
        chart.items.slice(0, SHOW_ROWS).map((item, index) => (
          <div key={`${item.rank}-${item.title}`} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index < 2 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {item.rank}
            </span>
            <span className="plaza-demo-ranklist-text">
              {item.title}
              {item.artists ? ` — ${item.artists}` : ''}
            </span>
            <span className="plaza-demo-ranklist-meta">{mmss(item.duration)}</span>
          </div>
        ))}

      {!chart && failed && (
        <div className="plaza-demo-ranklist-text">{PLATFORM_NAME[platform]}取不到（上游 503），点击卡片换下一个</div>
      )}
    </div>
  );
}
