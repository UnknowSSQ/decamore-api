import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { ROUTES } from '@/constants/app';

/** 要「像按钮的链接」就用 buttonVariants() 套到 <Link> 上，不再另做一套按钮组件 */
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-[80vh] items-center justify-center bg-bg px-6 py-dsp-6">
      <div className="text-center">
        <span aria-hidden className="block font-serif text-[86px] italic leading-none text-primary/85">
          404
        </span>
        <h1 className="mt-4 text-[20px] font-semibold text-ink">这里没有你要找的内容</h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-[12.5px] leading-relaxed text-muted">
          页面可能已经下线、改名，或者链接里有个错别字。从下面任意一个入口继续浏览即可。
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href={ROUTES.home} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            返回首页
          </Link>
          <Link href={ROUTES.plaza} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            接口广场
          </Link>
          <Link href={ROUTES.docs} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            开发文档
          </Link>
          <Link
            href={ROUTES.login}
            className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            控制台登录
          </Link>
        </div>
      </div>
    </main>
  );
}
