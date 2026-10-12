'use client';
/** 卡片是横版窄格，所以固定取 type=pc。
 *  只渲染 thumb（约 15KB 的 webp），原图直链留给调用方，卡片不下载几百 KB 的 jpg */
import { LazyImage } from '@/components/shared/LazyImage';
import { fetchWallpaper } from '@/lib/api';
import type { DemoProps } from './types';
import { useDemoFetch } from './types';

/** 首帧要渲染服务端也算得出的确定值（React #418） */
const PLACEHOLDER = '正在取壁纸…';

export function WallpaperDemo({ seed }: DemoProps) {
  const { data: shot, failed } = useDemoFetch(seed, () => fetchWallpaper('pc'));

  return (
    <div className="plaza-demo-photo">
      {shot && <LazyImage className="plaza-demo-photo-img" src={shot.thumb} alt="" />}
      <span className="plaza-demo-photo-caption">
        {!shot && failed
          ? '壁纸取不到，点击卡片重试'
          : shot
            ? `PC${shot.width && shot.height ? ` · ${shot.width} × ${shot.height}` : ''}`
            : PLACEHOLDER}
      </span>
    </div>
  );
}
