'use client';
/** 填字题目点选即判定：对了开格，停一拍自动换下一首；错了只把该选项灰掉，还能再试 */
import { useEffect, useState } from 'react';

import { fetchPoetry } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取一首诗…';
/** 答对后停留一拍再换，否则看不清开格这一步 */
const SOLVED_HOLD_MS = 1000;

export function PoetryDemo({ seed }: DemoProps) {
  const [wrong, setWrong] = useState<readonly string[]>([]);
  const [solved, setSolved] = useState(false);
  /** 答对自动换首：seed 由用户点卡片驱动，round 由定时器驱动，合成一个 key 共用同一次取数 */
  const [round, setRound] = useState(0);
  const { data: poem, failed } = useDemoFetch(`${seed}:${round}`, () => fetchPoetry());

  // 换题就清掉上一题的作答痕迹；定时器 effect 看到 solved 变 false 会自己撤掉挂起的换首
  useEffect(() => {
    setWrong([]);
    setSolved(false);
  }, [seed, round]);

  useEffect(() => {
    if (!solved) return;
    const timer = setTimeout(() => setRound((prev) => prev + 1), SOLVED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [solved]);

  if (!poem) {
    return (
      <div className="plaza-demo-poetry">
        <p className="plaza-demo-poetry-muted">{failed ? '诗词获取失败，点击卡片重试' : PLACEHOLDER}</p>
      </div>
    );
  }

  const { blank } = poem;
  // 两句取「含题干的那一整行」而不是 quote：quote 是本诗最有名的一联，语料里有 25 首它跟题干不在同一联
  const line = poem.lines.find((l) => l.includes(blank.prompt)) ?? blank.prompt;
  const at = line.indexOf(blank.prompt) + blank.index;

  return (
    <div className="plaza-demo-poetry">
      <p className="plaza-demo-poetry-head">{poem.title}</p>
      <p className="plaza-demo-poetry-label">补全名句</p>
      <p className="plaza-demo-poetry-prompt">
        {line.slice(0, at)}
        {/* 空位只留一条横线：300 首里 88 首的空位紧贴标点，摆个「？」会渲染成「？。」这种双标点 */}
        <span>{solved ? blank.answer : ''}</span>
        {line.slice(at + 1)}
      </p>
      <p className="plaza-demo-poetry-author">
        —— {poem.author} · {poem.dynasty}
      </p>
      <div className="plaza-demo-poetry-options">
        {blank.options.map((option) => {
          const isAnswer = option === blank.answer;
          const isWrong = wrong.includes(option);
          return (
            <button
              type="button"
              key={option}
              disabled={solved || isWrong}
              className={`plaza-demo-poetry-option${solved && isAnswer ? ' is-right' : ''}${isWrong ? ' is-wrong' : ''}`}
              onClick={() => {
                if (isAnswer) setSolved(true);
                else setWrong((prev) => [...prev, option]);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
