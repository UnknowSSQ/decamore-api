'use client';
/** 每次固定取九条铺成词签；点击卡片换一批 */
import { fetchIdioms } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取一批成语…';
const LIMIT = 9;

export function IdiomsDemo({ seed }: DemoProps) {
  const { data: list, failed } = useDemoFetch(seed, () => fetchIdioms(LIMIT));

  return (
    <div className="plaza-demo-idioms">
      {list ? (
        <div className="plaza-demo-idioms-grid">
          {list.items.map((item) => (
            <span key={item} className="plaza-demo-idioms-chip">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span className="plaza-demo-idioms-empty">
          {failed ? '成语获取失败，点击卡片重试' : PLACEHOLDER}
        </span>
      )}
    </div>
  );
}
