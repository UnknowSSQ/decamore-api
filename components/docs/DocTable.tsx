/** 文档表格：variant 决定列结构，行数据由 components/docs/apis/*.ts 提供 */
import { Code } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { DocTableRow, DocTableVariant, InlineFragment } from './types';

interface DocTableProps {
  variant: DocTableVariant;
  rows: DocTableRow[];
}

function renderFragments(fragments: InlineFragment[]) {
  return fragments.map((frag, i) =>
    frag.type === 'code' ? <Code key={i}>{frag.value}</Code> : <span key={i}>{frag.value}</span>,
  );
}

function RequiredBadge({ state }: { state: 'yes' | 'no' | 'na' }) {
  const map = {
    yes: { label: '必填', className: 'bg-[#f6e3d6] text-[#a1552b]' },
    no: { label: '可选', className: 'bg-[#eceee7] text-[#6b726b]' },
    na: { label: '—', className: 'bg-[#f1f2ec] text-[#9aa49b]' },
  };
  const item = map[state];
  return (
    <span className={cn('inline-block rounded-[6px] px-2 py-[2px] text-[11px] font-medium', item.className)}>
      {item.label}
    </span>
  );
}

export function DocTable({ variant, rows }: DocTableProps) {
  const headers = getHeaders(variant);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-0 pb-[11px] pr-[14px] text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9aa49b] border-b border-line"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'group transition-colors hover:bg-[rgba(54,91,73,0.035)]',
                row.isChild && 'is-child',
              )}
            >
              {renderRowCells(variant, row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getHeaders(variant: DocTableVariant): string[] {
  switch (variant) {
    case 'request':
      return ['项目', '取值', '说明'];
    case 'params':
      return ['字段', '类型', '必填', '默认值', '说明'];
    case 'response':
      return ['字段', '类型', '说明'];
    case 'headers':
      return ['名称', '示例值', '说明'];
    case 'errors':
      return ['HTTP', 'statusCode', '含义', '处理建议'];
    case 'limits':
      return ['项目', '限制', '说明'];
    case 'changelog':
      return ['日期', '版本', '变更'];
  }
}

function renderRowCells(variant: DocTableVariant, row: DocTableRow) {
  const fnameClass = cn(
    'whitespace-nowrap text-[12px] font-semibold text-ink',
    row.isChild && 'pl-[19px] relative text-[#57615a] font-medium',
  );

  const tdBase = 'px-0 py-[14px] pr-[14px] border-b border-dashed border-line text-[#4d554e] leading-[1.8] align-top';

  switch (variant) {
    case 'request':
      return (
        <>
          <td className={cn(tdBase, fnameClass)}>{row.name}</td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.type}</span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );

    case 'params':
      return (
        <>
          <td className={cn(tdBase, fnameClass)}>
            {row.isChild && (
              <span className="absolute left-0 top-[18px] bottom-[18px] w-px bg-[#d9ddd6]" aria-hidden />
            )}
            <span className="font-mono">{row.name}</span>
          </td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.type}</span>
          </td>
          <td className={tdBase}>
            {row.required && <RequiredBadge state={row.required} />}
          </td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.defaultValue ?? '—'}</span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );

    case 'response':
      return (
        <>
          <td className={cn(tdBase, fnameClass)}>
            {row.isChild && (
              <span className="absolute left-0 top-[18px] bottom-[18px] w-px bg-[#d9ddd6]" aria-hidden />
            )}
            <span className="font-mono">{row.name}</span>
          </td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.type}</span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );

    case 'headers':
      return (
        <>
          <td className={cn(tdBase, fnameClass)}>
            <span className="font-mono">{row.name}</span>
          </td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.example}</span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );

    case 'errors':
      return (
        <>
          <td className={tdBase}>
            <span className="inline-block rounded-[6px] bg-[#f1f2ec] px-2 py-[2px] font-mono text-[11px] font-semibold text-[#6b726b]">
              {row.http}
            </span>
          </td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.statusCode}</span>
          </td>
          <td className={cn(tdBase, 'font-medium text-ink')}>{renderFragments(row.description)}</td>
          <td className={tdBase}>{row.suggestion && renderFragments(row.suggestion)}</td>
        </>
      );

    case 'limits':
      return (
        <>
          <td className={cn(tdBase, fnameClass)}>{row.name}</td>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.type}</span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );

    case 'changelog':
      return (
        <>
          <td className={tdBase}>
            <span className="font-mono text-[11.5px] text-[#57615a]">{row.name}</span>
          </td>
          <td className={tdBase}>
            <span className="inline-block rounded-[6px] bg-[#e9ede4] px-2 py-[2px] font-mono text-[11px] font-semibold text-[#365b49]">
              {row.type}
            </span>
          </td>
          <td className={tdBase}>{renderFragments(row.description)}</td>
        </>
      );
  }
}
