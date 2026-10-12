import Link from 'next/link';

import { APP_NAME, COPYRIGHT_YEAR, FOOTER_LINKS } from '@/constants/app';
import { getSiteSettings } from '@/lib/server/store/settings';
import { Brand } from '@/components/ui/Brand';

/** 服务端渲染时读一次进程内设置：后台改完要等页面下次生成或请求才反映到页脚 */
export function SiteFooter() {
  const { contactEmail, icp } = getSiteSettings();

  return (
    <footer className="bg-bg py-7 text-[12px] text-muted">
      <div className="wrap flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Brand size="sm" label={APP_NAME} ariaLabel={`返回 ${APP_NAME} 首页`} />
        <p className="m-0 text-center sm:text-left">
          © {COPYRIGHT_YEAR} {APP_NAME} · 十倍爱你，十倍好用。
          {contactEmail && (
            <>
              {' '}
              <a href={`mailto:${contactEmail}`} className="transition-colors hover:text-primary">
                {contactEmail}
              </a>
            </>
          )}
          {icp && <span className="ml-2">{icp}</span>}
        </p>
        <nav aria-label="页脚导航" className="flex flex-wrap items-center gap-5">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href + link.label} href={link.href} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
