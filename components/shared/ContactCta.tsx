'use client';
/** 裸 mailto 在手机上会直接跳邮件客户端，所以先弹窗给可复制的地址，mailto 降为第二操作。
 *  按钮 className 由调用方用 buttonVariants() 生成；用 useToastSafe 免得缺 Provider 时抛错 */
import { useCallback, useState, type ReactNode } from 'react';

import { CONTACT_EMAIL, mailtoWithSubject } from '@/constants/app';
import { useCopyToClipboard } from '@/hooks/useUi';
import { useToastSafe } from '@/components/providers/AppProviders';
import { Modal } from '@/components/ui/Overlay';
import { Icon } from '@/components/ui/Icon';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/utils/cn';

interface ContactCtaProps {
  title: string;
  description: string;
  subject: string;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}

export function ContactCta({ title, description, subject, children, className, trailing }: ContactCtaProps) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const toast = useToastSafe();

  const close = useCallback(() => setOpen(false), []);

  const onCopy = useCallback(async () => {
    const ok = await copy(CONTACT_EMAIL);
    if (ok) toast.success('邮箱已复制', `${CONTACT_EMAIL} 已粘贴到剪贴板`);
    else toast.error('复制失败', '请手动选择邮箱文本复制');
  }, [copy, toast]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn('inline-flex shrink-0 items-center justify-center', className)}
      >
        {children}
        {trailing}
      </button>

      <Modal
        open={open}
        onClose={close}
        title={title}
        description={description}
        width="max-w-[460px]"
        footer={
          <>
            {/* 仍保留直达邮件客户端的入口，只是不再是唯一路径。
                这里必须用 buttonVariants：裸 <a> 上没有 inline-flex，h-8/px-3 这类
                尺寸类对非替换行内元素不生效，按钮会塌成一串普通文字。 */}
            <a href={mailtoWithSubject(subject)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
              <Icon name="mail" size={13} />
              打开邮件客户端
            </a>
            <button
              type="button"
              data-autofocus
              onClick={() => void onCopy()}
              className={cn(
                buttonVariants({ variant: 'primary', size: 'sm' }),
                'font-semibold',
                copied && 'bg-ok hover:bg-ok',
              )}
            >
              <Icon name={copied ? 'check' : 'copy'} size={13} />
              {copied ? '已复制' : '复制邮箱'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="mb-0 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa49b]">
            <Icon name="mail" size={13} className="text-primary" />
            邮箱地址
          </p>

          {/* 全选即复制：即使剪贴板 API 不可用（非安全上下文），用户也能长按选中 */}
          <div
            title="点击即可全选"
            onClick={(event) => {
              const range = document.createRange();
              range.selectNodeContents(event.currentTarget);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }}
            className="cursor-text select-all rounded-xl border border-dashed border-primary/30 bg-sage/40 px-4 py-3.5 text-center text-[16px] font-semibold tracking-[0.01em] text-ink transition-colors hover:border-primary/55"
          >
            {CONTACT_EMAIL}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-line bg-bg-soft px-2.5 py-1 text-[11px] text-muted">
              工作日 24 小时内回复
            </span>
            <span className="rounded-full border border-line bg-bg-soft px-2.5 py-1 text-[11px] text-muted">
              标题建议写「{subject}」
            </span>
          </div>

          <p className="mb-0 text-[11.5px] leading-relaxed text-muted">
            点上方地址可直接全选复制；复制按钮不可用时（例如非安全上下文的剪贴板权限被拒）请手动选取。
          </p>
        </div>
      </Modal>
    </>
  );
}
