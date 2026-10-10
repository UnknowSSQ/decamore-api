'use client';
/** 上游 5 秒一刷，本接口对外缓存 1 小时：连点大概率是同一份，抬头用 updateTime +「（缓存）」说明没坏 */
import { useEffect, useState } from 'react';

import { fetchHotChart } from '@/lib/api';
import type { HotChartItem, HotChartResult } from '@/types';
import type { DemoProps } from './types';

const SHOW_ROWS = 6;

/** 优先用上游拼好的「1510.39万」，缺字段时退回按元格式化，不自己造单位 */
function boxText(item: HotChartItem): string {
  if (item.boxOfficeText) return item.boxOfficeText;
  return item.boxOffice === null ? '' : item.boxOffice.toLocaleString('en-US');
}

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function HotChartDemo({ seed }: DemoProps) {
  const [board, setBoard] = useState<HotChartResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧榜单覆盖新榜单
    let ignore = false;
    void (async () => {
      try {
        const next = await fetchHotChart(SHOW_ROWS);
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
  }, [seed]);

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `猫眼实时票房 · ${clock(board.updateTime)} 更新${board.cached ? '（缓存）' : ''}`
          : failed
            ? '猫眼实时票房'
            : '正在取热映榜…'}
      </div>

      {board &&
        board.items.slice(0, SHOW_ROWS).map((item, index) => (
          <div key={`${item.rank}-${item.title}`} className="plaza-demo-ranklist-row">
            <span className={`plaza-demo-ranklist-rank${index < 2 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
              {item.rank}
            </span>
            <span className="plaza-demo-ranklist-text">
              {item.title}
              {item.releaseInfo ? ` — ${item.releaseInfo}` : ''}
            </span>
            <span className="plaza-demo-ranklist-meta">{boxText(item)}</span>
          </div>
        ))}

      {!board && failed && <div className="plaza-demo-ranklist-text">热映榜取不到（上游 503），点击卡片重试</div>}
    </div>
  );
}
