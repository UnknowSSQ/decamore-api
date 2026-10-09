/** ContactCta 是这区块里唯一的客户端岛，其余保持服务端渲染 */
import { ContactCta } from '@/components/shared/ContactCta';
import { Reveal } from '@/components/shared/Reveal';

export function CtaSection() {
  return (
    <section className="wrap py-[104px]" id="contact">
      <Reveal>
        <div
          className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-[28px] bg-primary px-[46px] py-[42px] text-white md:flex-row md:items-center"
          style={{
            background:
              'radial-gradient(620px 260px at 88% 8%, rgba(255,255,255,0.12), transparent 60%), rgb(var(--c-primary))',
          }}
        >
          <div>
            <p className="kicker kicker--line mb-3.5 text-[11px] text-hair">Ready to build?</p>
            <h2 className="mb-0 max-w-[570px] text-[clamp(28px,3.2vw,38px)] font-medium leading-[1.25] tracking-[-0.045em]">
              开始接入 Decamore API
            </h2>
            <p className="mt-3 mb-0 text-[13px] text-[rgba(255,255,255,0.72)]">
              专注轻量化接口服务，免费开放接口，无门槛调用，助力开发者快速搭建内容场景。
            </p>
          </div>
          <ContactCta
            title="联系 Decamore API"
            description="接入咨询、合作或问题反馈都可以直接发邮件。"
            subject="Decamore API 接入咨询"
            className="h-12 gap-3 rounded-full bg-surface px-5 text-[13px] font-medium text-primary-dark transition-all hover:-translate-y-0.5 hover:bg-wash-2"
            trailing={<span aria-hidden className="text-[17px]">↗</span>}
          >
            联系我们
          </ContactCta>
        </div>
      </Reveal>
    </section>
  );
}
