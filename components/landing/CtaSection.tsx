import { CtaPanel } from '@/components/shared/CtaPanel';
import { getSiteSettings } from '@/lib/server/store/settings';

export function CtaSection() {
  const { contactEmail } = getSiteSettings();

  return (
    <section className="wrap py-[104px]" id="contact">
      <CtaPanel
        kicker="Ready to build?"
        heading="开始接入 Decamore API"
        body="专注轻量化接口服务，免费开放接口，无门槛调用，助力开发者快速搭建内容场景。"
        email={contactEmail}
        dialogTitle="联系 Decamore API"
        dialogDescription="接入咨询、合作或问题反馈都可以直接发邮件。"
        subject="Decamore API 接入咨询"
        actionLabel="联系我们"
      />
    </section>
  );
}
