'use client';
/** 毒鸡汤与疯狂星期四都是一条随机文本，共用取数；毒鸡汤走一言那套引号排版，kfc 是长段落走文本面板 */
import { fetchKfc, fetchSoulsoup } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取一条…';

const loadSoulsoup = async () => (await fetchSoulsoup()).content;
const loadKfc = async () => (await fetchKfc()).content;

export function SoulsoupDemo({ seed }: DemoProps) {
  const { data: text, failed } = useDemoFetch(seed, loadSoulsoup);

  return (
    <div className="plaza-demo-quote">
      <div className="plaza-demo-quote-mark" aria-hidden="true">&ldquo;</div>
      <div className="plaza-demo-quote-text line-clamp-6">
        {text ?? (failed ? '毒鸡汤获取失败，点击卡片重试' : PLACEHOLDER)}
      </div>
    </div>
  );
}

export function KfcDemo({ seed }: DemoProps) {
  const { data: text, failed } = useDemoFetch(seed, loadKfc);

  return (
    <div className="plaza-demo-text">
      <p className="plaza-demo-text-body line-clamp-[7]">
        {text ?? (failed ? '疯狂星期四获取失败，点击卡片重试' : PLACEHOLDER)}
      </p>
    </div>
  );
}
