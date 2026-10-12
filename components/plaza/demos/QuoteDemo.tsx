'use client';
import { fetchHitokoto } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取一句…';

export function QuoteDemo({ seed }: DemoProps) {
  const { data: line, failed } = useDemoFetch(seed, () => fetchHitokoto());

  return (
    <div className="plaza-demo-quote">
      <div className="plaza-demo-quote-mark" aria-hidden="true">&ldquo;</div>
      <div className="plaza-demo-quote-text line-clamp-6">
        {line ? line.content : failed ? '一言获取失败，点击卡片重试' : PLACEHOLDER}
      </div>
      {line && (
        <div className="plaza-demo-quote-author">
          &mdash; {line.creator}
          {line.source ? ` · ${line.source}` : ''}
        </div>
      )}
    </div>
  );
}
