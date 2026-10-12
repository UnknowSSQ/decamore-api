'use client';
/** 一条热评配它的出处：评论正文 + 「昵称 · 歌名 · 点赞数」署名，排版沿用一言那块引号 */
import { fetchNeteaseComment } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取一条热评…';

export function NeteaseDemo({ seed }: DemoProps) {
  const { data: line, failed } = useDemoFetch(seed, () => fetchNeteaseComment());

  return (
    <div className="plaza-demo-quote">
      <div className="plaza-demo-quote-mark" aria-hidden="true">&ldquo;</div>
      <div className="plaza-demo-quote-text line-clamp-6">
        {line ? line.comment : failed ? '热评取不到，点击卡片重试' : PLACEHOLDER}
      </div>
      {line && (
        <div className="plaza-demo-quote-author">
          &mdash; {line.nickname} · 《{line.song}》 · {line.likedCount} 赞
        </div>
      )}
    </div>
  );
}
