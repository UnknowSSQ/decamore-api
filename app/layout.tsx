import type { Metadata, Viewport } from 'next';

import { AppProviders } from '@/components/providers/AppProviders';
import { APP_DESCRIPTION, APP_NAME } from '@/constants/app';
import { siteUrl } from '@/env';
import './globals.css';

/**
 * 根布局不读 Cookie：一次 resolveSession() 会让首页、广场与全部文档页退出静态渲染。
 * 控制台的会话由 app/admin/layout.tsx 的 guardPage() 在服务端校验，
 * AuthProvider 自己在客户端静默补一次 /auth/me（见 hooks/useAuth.tsx 的 bootstrap 分支）。
 */

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${APP_NAME} · 免费多元接口能力`,
    // 子页面用 `title: { absolute: '...' }` 覆盖模板（例如控制台不带品牌后缀）
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ['免费接口', 'API 广场', '一言', '随机壁纸', '开发者工具'],
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: 'zh_CN',
  },
  twitter: { card: 'summary', title: APP_NAME, description: APP_DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#365b49',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 跳转正文：Tab 键第一个落点。样式见 globals.css .skip-link
            （默认移出视口，:focus-visible 时落回导航下方），
            每个前台页面的 <main id="main"> 是它的目标。 */}
        <a className="skip-link" href="#main">
          跳到主要内容
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
