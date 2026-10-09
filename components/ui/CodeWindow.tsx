'use client';
/** 高亮走 lib/render/highlight.ts 产出 token；复制按钮只复制当前可见的那一段 */
import { useId, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

import { highlightCode, normalizeCode, type HighlightLang } from '@/lib/render/highlight';
import { useCopyToClipboard } from '@/hooks/useUi';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';

export interface CodePane {
  value: string;
  label: string;
  code: string;
  lang?: HighlightLang;
}

export interface CodeWindowProps {
  /** 与 panes 二选一 */
  code?: string;
  lang?: HighlightLang;
  panes?: readonly CodePane[];
  title?: ReactNode;
  defaultPane?: string;
  lineNumbers?: boolean;
  copyLabel?: string;
  className?: string;
  footnote?: ReactNode;
}

export function CodeWindow({
  code,
  lang = 'text',
  panes,
  title,
  defaultPane,
  lineNumbers = true,
  copyLabel = '复制',
  className,
  footnote,
}: CodeWindowProps) {
  const { copied, copy } = useCopyToClipboard();
  // 加 useId 前缀：同页可能有两个 CodeWindow，裸用 pane.value 会让 DOM id 重复
  const uid = useId();
  const tabId = (value: string) => `code-tab-${uid}-${value}`;
  const panelId = (value: string) => `code-panel-${uid}-${value}`;
  const list: readonly CodePane[] = panes ?? [{ value: 'main', label: '', code: code ?? '', lang }];
  const [active, setActive] = useState(defaultPane ?? list[0]?.value ?? 'main');
  const current = list.find((pane) => pane.value === active) ?? list[0];
  const text = normalizeCode(current?.code ?? '');
  const lines = highlightCode(text, current?.lang ?? lang);
  const showTabs = list.length > 1;

  const copyButton = (
    <button type="button" className="code-copy" onClick={() => void copy(text, current?.value)} aria-label="复制当前示例代码">
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? '已复制' : copyLabel}
    </button>
  );

  // roving tabindex 必须自带方向键切换，否则键盘用户被困在当前 tab 上
  const onTabListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!showTabs) return;
    const index = list.findIndex((pane) => pane.value === active);
    if (index < 0) return;
    const step =
      event.key === 'ArrowRight' ? 1
        : event.key === 'ArrowLeft' ? -1
          : event.key === 'Home' ? -index
            : event.key === 'End' ? list.length - 1 - index
              : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + list.length) % list.length;
    const pane = list[next];
    if (!pane) return;
    setActive(pane.value);
    // 焦点跟着选中项走，否则 roving tabindex 下会「丢焦点」
    document.getElementById(tabId(pane.value))?.focus();
  };

  return (
    <div className={cn('code-window', className)}>
      {title && (
        <div className="code-titlebar">
          <span className="code-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="code-title">{title}</span>
          {/* 无 tab 时复制按钮靠右挂在标题栏；有 tab 时交给 tab 行，避免两个复制键 */}
          {!showTabs && copyButton}
        </div>
      )}

      {showTabs && (
        // tablist 的子元素应当只有 tab，所以套一层 display:contents 的 role=tablist：按钮仍参与外层 flex 布局，视觉零变化
        <div className="code-tabs">
          <div className="contents" role="tablist" aria-label="示例语言" onKeyDown={onTabListKeyDown}>
            {list.map((pane) => (
              <button
                key={pane.value}
                type="button"
                role="tab"
                id={tabId(pane.value)}
                // aria-selected 只在 role=tab 上合法，挂裸 button 会被 a11y 规则判错
                aria-selected={pane.value === active}
                aria-controls={panelId(pane.value)}
                // 整组 tab 只占一个 Tab 键位，组内靠方向键走
                tabIndex={pane.value === active ? 0 : -1}
                className="code-tab-btn"
                onClick={() => setActive(pane.value)}
              >
                {pane.label}
              </button>
            ))}
          </div>
          {copyButton}
        </div>
      )}

      {!title && !showTabs && (
        <div className="code-tabs" style={{ borderBottom: 'none' }}>
          {copyButton}
        </div>
      )}

      <pre
        className="code-body"
        // 只有一个 pre 承载当前面板：id / aria-labelledby 随 active 变，每个 tab 的 aria-controls 才指得通
        // tabIndex=0：代码区要横向滚动，键盘用户得能聚焦进来
        id={showTabs ? panelId(current?.value ?? 'main') : undefined}
        role={showTabs ? 'tabpanel' : undefined}
        aria-labelledby={showTabs ? tabId(current?.value ?? 'main') : undefined}
        tabIndex={0}
      >
        <code>
          {lines.map((tokens, index) => (
            <span key={index} className="code-line" data-ln={lineNumbers ? String(index + 1) : undefined}>
              {tokens.length === 0 ? '\u00a0' : tokens.map((token, i) => (
                <span key={i} className={token.kind === 'plain' ? undefined : `tok-${token.kind}`}>
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>

      {footnote && <div className="border-t border-white/10 px-5 py-3 text-[11px] leading-relaxed text-[#8d9c92]">{footnote}</div>}
    </div>
  );
}
