'use client';
/** 接口无参数、答案与问题无关：question 只是仪式感，不发后端也不写进 URL */
import { useCallback, useEffect, useId, useState } from 'react';

import { fetchAnswerbook } from '@/lib/api';
import type { AnswerBookEntry } from '@/types';
import type { DemoProps } from './types';

export function AnswerBookDemo({ seed }: DemoProps) {
  const inputId = useId();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnswerBookEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // 点卡片空白处会让 seed 自增：只退回提问态、保留已输入的问题，清空只由「清空重问」触发
  useEffect(() => {
    setAnswer(null);
    setFailed(false);
  }, [seed]);

  const flip = useCallback(async () => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      setAnswer(await fetchAnswerbook());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [busy, question]);

  const backToQuestion = useCallback(() => {
    setAnswer(null);
    setFailed(false);
  }, []);

  const clearAndAskAgain = useCallback(() => {
    setAnswer(null);
    setFailed(false);
    setQuestion('');
  }, []);

  return (
    <div className="plaza-demo-answerbook">
      {answer ? (
        <>
          <p className="plaza-demo-answerbook-answer" role="status" aria-live="polite">
            {answer.chinese}
          </p>
          {answer.english && <p className="plaza-demo-answerbook-en">{answer.english}</p>}
          <p className="plaza-demo-answerbook-no">「{question.trim()}」</p>

          <div className="mt-[14px] flex gap-2">
            <button
              type="button"
              className="plaza-demo-answerbook-btn"
              onClick={backToQuestion}
              disabled={busy}
            >
              翻回疑问
            </button>
            <button
              type="button"
              className="plaza-demo-answerbook-btn is-primary"
              onClick={clearAndAskAgain}
              disabled={busy}
            >
              清空重问
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="plaza-demo-answerbook-label" htmlFor={inputId}>
            写下你的疑问
          </label>
          <input
            id={inputId}
            className="plaza-demo-answerbook-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void flip();
            }}
            placeholder="今天运气如何？"
            maxLength={60}
            autoComplete="off"
            disabled={busy}
          />

          <button
            type="button"
            className="plaza-demo-answerbook-flip"
            onClick={() => void flip()}
            disabled={!question.trim() || busy}
          >
            {busy ? '翻页中…' : '翻 一 翻'}
          </button>

          <p className="plaza-demo-answerbook-tip" role="status" aria-live="polite">
            {failed ? '答案取不到，再翻一次' : question.trim() ? '当你选择翻页时，心中已经有了一个答案' : ''}
          </p>
        </>
      )}
    </div>
  );
}
