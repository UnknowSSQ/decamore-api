import { ContactCta } from '@/components/shared/ContactCta';
import { Reveal } from '@/components/shared/Reveal';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/utils/cn';

interface CtaPanelProps {
  kicker: string;
  heading: string;
  body: string;
  /** 联系邮箱由服务端从后台设置取，组件不留第二份地址 */
  email: string;
  dialogTitle: string;
  dialogDescription: string;
  subject: string;
  actionLabel: string;
}

/**
 * 首页与接口广场共用的联系卡：文案与弹层都相同，只差外层 section 的间距。
 * 这里保持服务端组件，唯一的客户端岛是 ContactCta。
 */
export function CtaPanel({
  kicker,
  heading,
  body,
  email,
  dialogTitle,
  dialogDescription,
  subject,
  actionLabel,
}: CtaPanelProps) {
  return (
    <Reveal>
      <div
        className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-lg px-[46px] py-[42px] text-white md:flex-row md:items-center"
        style={{
          background:
            'radial-gradient(620px 260px at 88% 8%, rgba(255,255,255,0.12), transparent 60%), rgb(var(--c-primary))',
        }}
      >
        <div>
          <p className="kicker kicker--line mb-3.5 text-[11px] text-hair">{kicker}</p>
          <h2 className="mb-0 max-w-[570px] text-[clamp(28px,3.2vw,38px)] font-medium leading-[1.25] tracking-[-0.045em]">
            {heading}
          </h2>
          <p className="mt-3 mb-0 text-[13px] text-[rgba(255,255,255,0.72)]">{body}</p>
        </div>
        <ContactCta
          title={dialogTitle}
          description={dialogDescription}
          subject={subject}
          email={email}
          className={cn(
            buttonVariants({ variant: 'light', size: 'md' }),
            'h-12 gap-3 px-[21px] text-[13px] text-primary-dark hover:bg-wash-2',
          )}
          trailing="↗"
        >
          {actionLabel}
        </ContactCta>
      </div>
    </Reveal>
  );
}
