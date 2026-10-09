/** 把 apis/*.ts 里的 sections 渲染成 8 个文档分节 */
import { Callout } from '@/components/ui';
import { DocTable } from './DocTable';
import type { DocSection, InlineFragment, SectionContent } from './types';

interface DocBodyProps {
  sections: DocSection[];
}

function renderFragments(fragments: InlineFragment[]) {
  return fragments.map((frag, i) => {
    if (frag.type === 'code') {
      return (
        <code key={i} className="rounded-[6px] border border-line bg-bg-soft px-1.5 py-[1px] font-mono text-[0.86em] text-[#2f4a3a]">
          {frag.value}
        </code>
      );
    }
    return <span key={i}>{frag.value}</span>;
  });
}

function renderContent(item: SectionContent, index: number) {
  switch (item.kind) {
    case 'paragraph':
      return (
        <p key={index} className="text-[14px] leading-[1.85] text-ink-2">
          {renderFragments(item.fragments)}
        </p>
      );

    case 'table':
      return <DocTable key={index} node={item} />;

    case 'callout':
      return (
        <Callout key={index} tone={item.tone} mark={item.mark}>
          <strong>{item.strong}</strong>
          {renderFragments(item.fragments)}
        </Callout>
      );
  }
}

/** 唯一的 <main> 在 app/docs/[slug]/page.tsx 的中栏，这里不能再套一层 */
export function DocBody({ sections }: DocBodyProps) {
  return (
    <div className="doc-body">
      {sections.map((section) => (
        // --docs-anchor 在 ≤900px 自动加大，把吸顶目录条占掉的高度也算进去，否则章节标题被压住
        <section
          key={section.id}
          id={section.id}
          className="group relative mt-[46px] scroll-mt-[var(--docs-anchor)] border-t border-line pt-[44px] first:mt-0 first:border-t-0 first:pt-0"
        >
          <h2 className="flex items-center gap-2 text-[20px] font-semibold text-ink">
            {section.title}
            <a
              href={`#${section.id}`}
              className="h-link text-ink-4 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`锚点到 ${section.title}`}
            >
              #
            </a>
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {section.content.map((item, itemIndex) => renderContent(item, itemIndex))}
          </div>
        </section>
      ))}
    </div>
  );
}
