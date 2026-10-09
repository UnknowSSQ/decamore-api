'use client';
/** 独立成 Client Component：Server Component 上不能挂 onClick */
import { Icon } from '@/components/ui';
import { useCopyToClipboard } from '@/hooks/useUi';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      className={className}
      onClick={() => void copy(text)}
      aria-label={copied ? '已复制' : '复制'}
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? '已复制' : '复制'}
    </button>
  );
}
