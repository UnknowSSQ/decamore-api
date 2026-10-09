import Link from 'next/link';

import { APP_NAME, COPYRIGHT_YEAR, FOOTER_LINKS } from '@/constants/app';
import { Brand } from '@/components/ui/Brand';

export function SiteFooter() {
  return (
    <footer className="bg-bg py-7 text-[12px] text-muted">
      <div className="wrap flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Brand href="/" size="sm" label={APP_NAME} ariaLabel={`返回 ${APP_NAME} 首页`} />
        <p className="m-0">
          © {COPYRIGHT_YEAR} {APP_NAME} · 十倍爱你，十倍好用。
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
