'use client';
/** createPortal 挂到 document.body，避免被父级 transform / overflow 裁剪 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/utils/cn';
import { Button } from './Button';

/** SSR 阶段没有 document，挂载之后才能渲染 portal */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface BaseLayerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 破坏性操作的确认框应设 false */
  dismissOnOverlay?: boolean;
}

function useLayerBehavior({ open, onClose, dismissOnOverlay = true }: Pick<BaseLayerProps, 'open' | 'onClose' | 'dismissOnOverlay'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // 记原值再恢复，多个弹层叠着开也不会互相覆盖 body.overflow
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      // 焦点陷阱：Tab 走到末尾再按就回到开头
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
      target?.focus({ preventScroll: true });
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const onOverlayClick = useCallback(() => {
    if (dismissOnOverlay) onClose();
  }, [dismissOnOverlay, onClose]);

  return { panelRef, onOverlayClick };
}

function LayerTitle({ id, title, description, onClose }: { id: string; title?: ReactNode; description?: ReactNode; onClose: () => void }) {
  if (!title) return null;
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={id} className="text-[14.5px] font-semibold leading-snug text-ink">
          {title}
        </h2>
        {description && <p className="text-[12px] leading-relaxed text-muted">{description}</p>}
      </div>
      <CloseButton onClose={onClose} />
    </header>
  );
}

export function CloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="关闭"
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-[15px] leading-none text-muted transition-colors hover:border-primary hover:text-primary',
        className,
      )}
    >
      ×
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
  dismissOnOverlay = true,
  width = 'max-w-[520px]',
}: BaseLayerProps & { width?: string }) {
  const mounted = useMounted();
  // 标题 id 必须每次实例都不同：表单 Modal 上叠删除 ConfirmModal 时，写死的 id 会让 aria-labelledby 指向另一个弹层
  const titleId = useId();
  const { panelRef, onOverlayClick } = useLayerBehavior({ open, onClose, dismissOnOverlay });
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-scrim/45 backdrop-blur-[2px]"
        onClick={onOverlayClick}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-pop animate-fade-up',
          width,
          className,
        )}
      >
        <LayerTitle id={titleId} title={title} description={description} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-bg-soft/60 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
  dismissOnOverlay = true,
  width = 'w-[min(420px,100vw)]',
}: BaseLayerProps & { width?: string }) {
  const mounted = useMounted();
  const titleId = useId();
  const { panelRef, onOverlayClick } = useLayerBehavior({ open, onClose, dismissOnOverlay });
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 animate-fade-in bg-scrim/45 backdrop-blur-[2px]" onClick={onOverlayClick} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute top-0 bottom-0 flex flex-col border-line bg-surface shadow-pop',
          'right-0 animate-drawer-in-right border-l',
          width,
          className,
        )}
      >
        <LayerTitle id={titleId} title={title} description={description} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line bg-bg-soft/60 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** 删除类操作的统一入口，免得各页面自己拼 Modal */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      // 破坏性确认不该被一次误点遮罩关掉；BaseLayerProps 的注释说的就是这里
      dismissOnOverlay={false}
      title={title}
      width="max-w-[420px]"
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose}>
            {cancelText}
          </Button>
          {/* data-autofocus 让焦点陷阱的初始落点在确认键上，破坏性操作少一次 Tab */}
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            data-autofocus=""
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? '处理中…' : confirmText}
          </Button>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed text-muted">{description}</div>
    </Modal>
  );
}
