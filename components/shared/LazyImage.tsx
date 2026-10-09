'use client';
/**
 * 解码完成后淡入的 <img>。
 * 派生图已经很小，但广场一次换 6–10 张时硬切仍然很糙；缓存命中的图可能在 React 挂上
 * onLoad 之前就好了，所以挂载时先查一次 complete，否则会永远不透明。
 */
import { useCallback, useState, type ImgHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

export function LazyImage({
  className,
  onLoad,
  alt,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & { alt: string }) {
  const [loaded, setLoaded] = useState(false);

  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  }, []);

  return (
    // 站内静态资源与必应图床都是直链，用原生 img 是有意的：next/image 要为每个 CDN 再配一次 remotePatterns
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      ref={ref}
      alt={alt}
      decoding="async"
      loading="lazy"
      data-loaded={loaded || undefined}
      className={cn('lazy-img', className)}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      // 取不到也要显形：淡入的起点是 opacity 0，失败时不放开就会永久隐形
      onError={(event) => {
        setLoaded(true);
        rest.onError?.(event);
      }}
    />
  );
}
