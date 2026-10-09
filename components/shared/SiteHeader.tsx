'use client';
/** 依赖 scroll 与 matchMedia，只能是 Client Component；胶囊态样式在 globals.css 的 .site-header[data-scrolled] */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { APP_NAME, MAIN_NAV, NAV_CTA, ROUTES } from '@/constants/app';
import { Brand } from '@/components/ui/Brand';
import { cn } from '@/utils/cn';
import { useClickOutside, useScrolled } from '@/hooks/useUi';

export function SiteHeader() {
  const scrolled = useScrolled(40);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // 移动端点链接跳转后菜单会残留展开态
  useEffect(() => setOpen(false), [pathname]);

  const outsideRef = useClickOutside<HTMLDivElement>(() => {
    if (open) setOpen(false);
  }, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // 焦点还给汉堡按钮，否则菜单一关焦点就掉回 body
      toggleRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /** /docs/xxx 这类子路径也要高亮「文档」 */
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <nav className="site-nav wrap" aria-label="主导航">
        <Brand href={ROUTES.home} label={APP_NAME} ariaLabel={`返回 ${APP_NAME} 首页`} />

        <button
          ref={toggleRef}
          type="button"
          aria-label={open ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={open}
          aria-controls="site-nav-links"
          onClick={() => setOpen((v) => !v)}
          className="hidden h-[42px] w-[42px] place-items-center rounded-full border border-line text-ink transition-colors hover:border-primary max-[760px]:grid"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" />}
          </svg>
        </button>

        <div
          ref={outsideRef}
          id="site-nav-links"
          className={cn(
            'flex items-center gap-[34px] text-[13px] text-[#555d56]',
            // 面板锚定 .site-nav（relative）而不是 sticky header：下滑后 header 会加 padding-top，
            // 挂在 header 上定位就会和导航条错开；inset-x-0 因此天然与胶囊等宽
            'max-[760px]:absolute max-[760px]:inset-x-0 max-[760px]:top-[calc(100%+8px)] max-[760px]:z-50 max-[760px]:hidden max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-0 max-[760px]:rounded-2xl max-[760px]:border max-[760px]:border-line max-[760px]:bg-surface max-[760px]:p-2 max-[760px]:shadow-pop',
            open && 'max-[760px]:flex',
          )}
        >
          <NavLink href={ROUTES.home} label="概览" active={isActive(ROUTES.home)} />
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
          ))}
          <Link
            href={NAV_CTA.href}
            className="rounded-full border border-[#d9ddd6] px-[18px] py-[11px] text-[13px] text-ink transition-colors hover:border-[#c4cec2] hover:bg-[#eeefe9] max-[760px]:mt-1 max-[760px]:text-center"
          >
            {NAV_CTA.label} <span aria-hidden>↗</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'transition-colors duration-200 hover:text-primary max-[760px]:px-3 max-[760px]:py-[13px]',
        active && 'text-primary',
      )}
    >
      {label}
    </Link>
  );
}
