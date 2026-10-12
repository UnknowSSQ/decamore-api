'use client';
/** 上游 5 秒一刷，本接口对外缓存 1 小时：连点大概率是同一份，抬头用 updateTime +「（缓存）」说明没坏 */
import { fetchHotChart } from '@/lib/api';
import type { HotChartItem } from '@/types';
import type { DemoProps } from './types';
import { DEMO_ROWS, clock, useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取热映榜…';

/** 优先用上游拼好的「1510.39万」，缺字段时退回按元格式化，不自己造单位 */
function boxText(item: HotChartItem): string {
  if (item.boxOfficeText) return item.boxOfficeText;
  return item.boxOffice === null ? '' : item.boxOffice.toLocaleString('en-US');
}

export function HotChartDemo({ seed }: DemoProps) {
  const { data: board, failed } = useDemoFetch(seed, () => fetchHotChart(DEMO_ROWS));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `猫眼实时票房 · ${clock(board.updateTime)} 更新${board.cached ? '（缓存）' : ''}`
          : failed
            ? '猫眼实时票房'
            : PLACEHOLDER}
      </div>

      {board &&
        board.items.slice(0, DEMO_ROWS).map((item, index) => (
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
