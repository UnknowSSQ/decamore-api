/** 文档表格：variant 决定列结构，行数据由 components/docs/apis/*.ts 提供 */
import type { ReactNode } from 'react';

import { Code } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { InlineFragment, RequiredState, TableNode } from './types';

const TD =
  'px-0 py-[14px] pr-[14px] border-b border-dashed border-line text-ink-2 leading-[1.8] align-top';
const NAME = cn('whitespace-nowrap text-[12px] font-semibold text-ink');
const MONO = 'font-mono text-[11.5px] text-ink-3';

/** 传整个 TableNode 而不是 variant + rows，switch 收窄后每种行都只剩自己的字段，不需要任何 cast */
export function DocTable({ node }: { node: TableNode }) {
  switch (node.variant) {
    case 'request':
      return (
        <Shell headers={['项目', '取值', '说明']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <td className={cn(TD, NAME)}>{row.item}</td>
              <td className={TD}>
                <span className={MONO}>{row.value}</span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'params':
      return (
        <Shell headers={['字段', '类型', '必填', '默认值', '说明']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <FieldName name={row.name} isChild={row.isChild} />
              <td className={TD}>
                <span className={MONO}>{row.type}</span>
              </td>
              <td className={TD}>{row.required && <RequiredBadge state={row.required} />}</td>
              <td className={TD}>
                <span className={MONO}>{row.defaultValue ?? '—'}</span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'response':
      return (
        <Shell headers={['字段', '类型', '说明']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <FieldName name={row.name} isChild={row.isChild} />
              <td className={TD}>
                <span className={MONO}>{row.type}</span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'headers':
      return (
        <Shell headers={['名称', '示例值', '说明']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <td className={cn(TD, NAME)}>
                <span className="font-mono">{row.name}</span>
              </td>
              <td className={TD}>
                <span className={MONO}>{row.example}</span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'errors':
      return (
        <Shell headers={['HTTP', 'statusCode', '含义', '处理建议']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <td className={TD}>
                <span className="inline-block rounded-[6px] bg-wash px-2 py-[2px] font-mono text-[11px] font-semibold text-muted">
                  {row.http}
                </span>
              </td>
              <td className={TD}>
                <span className={MONO}>{row.statusCode}</span>
              </td>
              <td className={cn(TD, 'font-medium text-ink')}>
                <span className="block">{row.label}</span>
                <span className="block font-normal">{frags(row.description)}</span>
              </td>
              <td className={TD}>{row.suggestion && frags(row.suggestion)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'limits':
      return (
        <Shell headers={['项目', '限制', '说明']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <td className={cn(TD, NAME)}>{row.item}</td>
              <td className={TD}>
                <span className={MONO}>{row.limit}</span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );

    case 'changelog':
      return (
        <Shell headers={['日期', '版本', '变更']}>
          {node.rows.map((row, i) => (
            <tr key={i} className="group transition-colors hover:bg-[rgba(54,91,73,0.035)]">
              <td className={TD}>
                <span className={MONO}>{row.date}</span>
              </td>
              <td className={TD}>
                <span className="inline-block rounded-[6px] bg-sage px-2 py-[2px] font-mono text-[11px] font-semibold text-primary">
                  {row.version}
                </span>
              </td>
              <td className={TD}>{frags(row.description)}</td>
            </tr>
          ))}
        </Shell>
      );
  }
}

function Shell({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap border-b border-line px-0 pb-[11px] pr-[14px] text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-4"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function frags(fragments: InlineFragment[]) {
  return fragments.map((frag, i) =>
    frag.type === 'code' ? <Code key={i}>{frag.value}</Code> : <span key={i}>{frag.value}</span>,
  );
}

/** 嵌套字段行的名称列：左侧一条竖线表示「属于上一级」 */
function FieldName({ name, isChild }: { name: string; isChild?: boolean }) {
  return (
    <td className={TD}>
      <span className={cn(NAME, isChild && 'relative pl-[19px] font-medium text-ink-3')}>
        {isChild && <span className="absolute bottom-[18px] left-0 top-[18px] w-px bg-hair" aria-hidden />}
        <span className="font-mono">{name}</span>
      </span>
    </td>
  );
}

function RequiredBadge({ state }: { state: RequiredState }) {
  const map = {
    yes: { label: '必填', className: 'bg-warn-soft text-ink-warn' },
    no: { label: '可选', className: 'bg-wash text-muted' },
    na: { label: '—', className: 'bg-wash text-ink-4' },
  };
  const item = map[state];
  return (
    <span className={cn('inline-block rounded-[6px] px-2 py-[2px] text-[11px] font-medium', item.className)}>
      {item.label}
    </span>
  );
}
