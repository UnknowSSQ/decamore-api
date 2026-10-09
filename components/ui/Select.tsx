'use client';
/** 刻意用原生 <select>：移动端唤起系统选择器、键盘可达、不需要焦点陷阱。
 *  要搜索/多选走 TagEditor，别在这里堆下拉面板 */
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn';
import { controlVariants } from './Input';

const ARROW =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737a73' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m6.5 9.5 5.5 5.5 5.5-5.5'/></svg>\")";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof controlVariants> {
  /** 不传时用 children，分组 <optgroup> 场景走这条 */
  options?: readonly (SelectOption | string)[];
  invalid?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  // size 必须显式取出丢弃：随 rest 透传会把变体字符串写进原生的 number 属性
  { className, options, invalid, placeholder, tone, size: _size = 'md', children, ...rest },
  ref,
) {
  const normalized = options?.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlVariants({ tone: invalid ? 'error' : tone, size: 'md' }),
        'cursor-pointer appearance-none pr-9',
        className,
      )}
      // 箭头是 data-URI，放 style 里比 arbitrary class 稳，省掉空格与引号转义
      style={{
        backgroundImage: ARROW,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '16px 16px',
      }}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {normalized
        ? normalized.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))
        : children}
    </select>
  );
});

export function SettingRow({
  title,
  description,
  children,
  className,
  htmlFor,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  /* 没传 htmlFor 时生成 id 注入子控件（Switch / Select / Input 会把 id 转发到真实控件），否则读屏念不出设置项名；
     子节点是原生容器（滑块 + 数值、一组 Checkbox）时 label 绑不了 <div>，改走 role=group + aria-labelledby */
  const autoId = useId();
  const controlId = htmlFor ?? autoId;
  // 组件子节点（forwardRef / 函数组件）的 type 不是字符串标签名
  const isComponentChild = isValidElement<{ id?: string }>(children) && typeof children.type !== 'string';

  const child = useMemo(() => {
    if (htmlFor || !isValidElement<{ id?: string }>(children) || !isComponentChild) return children;
    return cloneElement(children, { id: children.props.id ?? controlId });
  }, [children, htmlFor, controlId, isComponentChild]);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-dashed border-line px-1 py-4 last:border-b-0',
        className,
      )}
    >
      <div className="min-w-[220px] flex-1">
        {isComponentChild || htmlFor ? (
          <label htmlFor={controlId} className="block text-[13px] font-semibold text-ink">
            {title}
          </label>
        ) : (
          <span id={`${controlId}-group`} className="block text-[13px] font-semibold text-ink">
            {title}
          </span>
        )}
        {description && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div
        className="flex shrink-0 items-center gap-3"
        {...(isComponentChild || htmlFor ? {} : { role: 'group', 'aria-labelledby': `${controlId}-group` })}
      >
        {child}
      </div>
    </div>
  );
}
