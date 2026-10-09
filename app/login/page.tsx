import type { Metadata } from 'next';

import Link from 'next/link';

import { ROUTES } from '@/constants/app';
import { Brand } from '@/components/ui/Brand';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: { absolute: '登录 · Decamore API' },
  robots: { index: false },
  description: 'Decamore API 控制台管理员登录。',
};

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen place-items-center gap-7 px-6 pb-8 pt-11 max-[460px]:gap-5 max-[460px]:px-[18px] max-[460px]:pb-6 max-[460px]:pt-7">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <span
          className="absolute -right-[150px] -top-[200px] h-[560px] w-[560px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 42% 40%, rgba(183, 200, 180, 0.42), rgba(247, 246, 242, 0) 68%)',
          }}
        />
        <span className="ring-deco -right-[180px] -top-[230px] h-[640px] w-[640px]" />
        <span
          className="ring-deco -right-[55px] -top-[125px] h-[430px] w-[430px]"
          style={{ borderColor: 'rgb(var(--c-primary) / 0.055)' }}
        />
        <span
          className="ring-deco -bottom-[150px] -left-[110px] h-[300px] w-[300px]"
          style={{ borderColor: 'rgb(var(--c-primary) / 0.05)' }}
        />
        <span
          className="absolute bottom-[12%] right-[8%] h-[118px] w-[118px] animate-drift rounded-full max-[460px]:-right-[10%] max-[460px]:bottom-[6%]"
          style={{
            background:
              'linear-gradient(135deg, rgba(183, 200, 180, 0.55), rgba(108, 141, 114, 0.42))',
            boxShadow: '18px 22px 44px rgba(46, 78, 57, 0.12)',
          }}
        />
      </div>

      <main id="main" tabIndex={-1} className="relative z-10 w-full max-w-[408px] rounded-[28px] border border-line bg-surface p-[34px_32px_30px] shadow-soft max-[460px]:rounded-[22px] max-[460px]:p-[26px_20px_24px]">
        <header className="mb-[26px] flex items-center justify-between gap-3.5 border-b border-line pb-[22px] max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-3">
          <Brand href={ROUTES.home} ariaLabel="返回 Decamore API 首页" />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgba(54,91,73,0.18)] bg-sage px-[11px] py-[5px] text-[10.5px] font-semibold tracking-[0.06em] text-primary">
            <svg
              aria-hidden
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
            管理员入口
          </span>
        </header>

        <LoginForm />
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-[18px] text-[11px] text-[#98a098]">
        <p>© 2026 Decamore API</p>
        <nav className="flex gap-[18px]">
          <Link href={ROUTES.home} className="transition-colors hover:text-primary">
            概览
          </Link>
          <Link href={ROUTES.plaza} className="transition-colors hover:text-primary">
            接口广场
          </Link>
          <Link href={ROUTES.docs} className="transition-colors hover:text-primary">
            文档
          </Link>
        </nav>
      </footer>
    </div>
  );
}
