'use client';
/** 平台由 seed 取模得出，首帧 seed=0 恒为微博，SSR 与水合才算得出同一个值。
 *  每平台服务端缓存 60 秒，抬头显示 updatedAt 和「（缓存）」，免得榜单没变被当成点击失效 */
import { useEffect, useState } from 'react';

import { fetchHotSearch } from '@/lib/api';
import type { HotSearchItem, HotSearchPlatform, HotSearchResult } from '@/types';
import type { DemoProps } from './types';

const SHOW_ROWS = 6;

/** 轮换顺序，与接口文档里的四个平台取值一致 */
const PLATFORM_ORDER: readonly HotSearchPlatform[] = ['weibo', 'douyin', 'baidu', 'zhihu'];
const PLATFORM_NAME: Record<HotSearchPlatform, string> = {
  weibo: '微博',
  douyin: '抖音',
  baidu: '百度',
  zhihu: '知乎',
};

/** 上游给文案就用原文（知乎「2017 万热度」），给数值就折成万 / 亿 */
function heatText(item: HotSearchItem): string {
  if (item.heatLabel) return item.heatLabel;
  if (item.heat === null) return '';
  if (item.heat >= 1e8) return `${(item.heat / 1e8).toFixed(1)} 亿`;
  if (item.heat >= 1e4) return `${Math.round(item.heat / 1e4)} 万`;
  return String(item.heat);
}

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function HotDemo({ seed }: DemoProps) {
  const [board, setBoard] = useState<HotSearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const platform = PLATFORM_ORDER[seed % PLATFORM_ORDER.length] as HotSearchPlatform;

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧榜单覆盖新榜单
    let ignore = false;
    void (async () => {
      try {
        const next = await fetchHotSearch(platform);
        if (!ignore) {
          setBoard(next);
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
        {board
          ? `${PLATFORM_NAME[board.platform]}热榜 · ${clock(board.updatedAt)} 更新${board.cached ? '（缓存）' : ''}`
          : failed
            ? `${PLATFORM_NAME[platform]}热榜`
            : `正在取${PLATFORM_NAME[platform]}榜…`}
      </div>

      {board &&
        board.items.slice(0, SHOW_ROWS).map((item, index) => (
          <div key={`${item.rank}-${item.title}`} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index < 2 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {item.rank}
            </span>
            <span className="plaza-demo-ranklist-text">{item.title}</span>
            <span className="plaza-demo-ranklist-meta">{heatText(item)}</span>
          </div>
        ))}

      {!board && failed && (
        <div className="plaza-demo-ranklist-text">{PLATFORM_NAME[platform]}取不到（上游 503），点击卡片换下一个</div>
      )}
    </div>
  );
}
