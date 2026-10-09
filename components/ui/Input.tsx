'use client';
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn';

const controlVariants = cva(
  'w-full rounded-field border bg-surface px-3.5 text-[13.5px] text-ink transition-colors duration-200 placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:bg-bg-soft disabled:text-muted',
  {
    variants: {
      tone: {
        default: 'border-line',
        error: 'border-danger focus:border-danger focus:ring-danger/20',
      },
      size: {
        sm: 'h-9 text-[12.5px]',
        md: 'h-11',
      },
    },
    defaultVariants: { tone: 'default', size: 'md' },
  },
);

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, extra, className, children }: FieldProps) {
  // 没传 htmlFor 就生成 id 注入子控件：靠调用方传时漏得多，label 绑不上控件、读屏念不出字段名
  // 显式传了 htmlFor 就原样输出（Checkbox 这类自带 id 的子控件）
  const autoId = useId();
  const controlId = htmlFor ?? autoId;
  const describedBy = [error ? `${controlId}-error` : null, hint ? `${controlId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  const child = useMemo(() => {
    if (htmlFor || !isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)) return children;
    return cloneElement(children, {
      id: children.props.id ?? controlId,
      'aria-describedby': children.props['aria-describedby'] ?? (describedBy || undefined),
    });
  }, [children, htmlFor, controlId, describedBy]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || extra) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={controlId} className="text-[12px] font-semibold tracking-[0.02em] text-ink">
              {label}
              {required && <span className="ml-1 text-danger">*</span>}
            </label>
          )}
          {extra}
        </div>
      )}
      {child}
      {/* 错误优先于提示；高度预留由 min-h 保证，避免文案出现时布局跳动 */}
      {(error || hint) && (
        <p
          id={error ? `${controlId}-error` : `${controlId}-hint`}
          className={cn('min-h-[16px] text-[11.5px] leading-snug', error ? 'text-danger' : 'text-muted')}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** 原生 input/textarea 的 size 是字符宽度，与这里的尺寸刻度语义冲突，统一 Omit 后交给 controlVariants */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof controlVariants> {
  icon?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, suffix, invalid, tone, size = 'md', ...rest },
  ref,
) {
  return (
    <div className="relative">
      {icon && (
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlVariants({ tone: invalid ? 'error' : tone, size }), icon && 'pl-10', suffix && 'pr-10', className)}
        {...rest}
      />
      {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{suffix}</span>}
    </div>
  );
});

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof controlVariants> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, tone, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(controlVariants({ tone: invalid ? 'error' : tone, size: 'md' }), 'py-2.5 leading-relaxed', className)}
      {...rest}
    />
  );
});

/** 大写锁定检测留给业务层（LoginForm 通过 Field.hint 展示），基础组件不掺业务判断 */
export const PasswordField = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'suffix'>>(
  function PasswordField(props, ref) {
    const fallbackId = useId();
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        {...props}
        id={props.id ?? fallbackId}
        type={visible ? 'text' : 'password'}
        suffix={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? '隐藏密码' : '显示密码'}
            className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-semibold text-muted transition-colors hover:bg-sage hover:text-primary"
          >
            {visible ? '隐藏' : '显示'}
          </button>
        }
      />
    );
  },
);

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }>(
  function Checkbox({ className, label, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <label htmlFor={inputId} className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted', className)}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line bg-surface transition-all checked:border-primary checked:bg-primary checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path fill=%22%23fffefa%22 d=%22M6.2 11.6 3 8.4l1.2-1.2 2 2 4.6-4.6L12 5.8z%22/></svg>')] bg-center bg-no-repeat"
          {...rest}
        />
        {label}
      </label>
    );
  },
);

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <span
        className={cn(
          'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors duration-200',
          checked ? 'border-primary bg-primary' : 'border-line bg-bg-soft',
          disabled && 'opacity-55 cursor-not-allowed',
        )}
      >
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute h-[16px] w-[16px] rounded-full bg-surface shadow-sm transition-all duration-200 ease-dec',
            checked ? 'left-[19px]' : 'left-[3px]',
          )}
        />
      </span>
      {label && <span className="text-[12.5px] text-ink">{label}</span>}
    </label>
  );
}

export { controlVariants };
