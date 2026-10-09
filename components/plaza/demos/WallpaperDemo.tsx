'use client';
/** 卡片是横版窄格，所以固定取 type=pc。
 *  只渲染 thumb（约 15KB 的 webp），原图直链留给调用方，卡片不下载几百 KB 的 jpg */
import { useEffect, useState } from 'react';

import { fetchWallpaper } from '@/lib/api';
import type { WallpaperItem } from '@/types';
import type { DemoProps } from './types';

export function WallpaperDemo({ seed }: DemoProps) {
  const [shot, setShot] = useState<WallpaperItem | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧图覆盖新图
    let ignore = false;
    void (async () => {
      try {
        const next = await fetchWallpaper('pc');
        if (!ignore) {
          setShot(next);
          setFailed(false);
        }
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [seed]);

  return (
    <div className="plaza-demo-photo">
      {shot && (
        // url 可能在站内也可能是必应图床，换 next/image 就得再配 remotePatterns，原生 img 更实在
        // eslint-disable-next-line @next/next/no-img-element
        <img className="plaza-demo-photo-img" src={shot.thumb} alt="" decoding="async" />
      )}
      <span className="plaza-demo-photo-caption">
        {!shot && failed
          ? '壁纸取不到，点击卡片重试'
          : shot
            ? `PC${shot.width && shot.height ? ` · ${shot.width} × ${shot.height}` : ''}`
            : '正在取壁纸…'}
      </span>
    </div>
  );
}
