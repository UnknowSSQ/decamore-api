'use client';
/** 三种静态资源演示共用 AssetDeck，差异只在 order / label / layout。
 *  列表服务端缓存 10 分钟，但每次点击都重新抽资源，画面确实会变 */
import { useEffect, useState } from 'react';

import { fetchAvatars, fetchEmoji, fetchImages } from '@/lib/api';
import type { AvatarType, EmojiType, ImageType, StaticAssetItem, StaticAssetList } from '@/types';
import type { DemoProps } from './types';

const TILE_COUNT = 6;

interface DeckProps<TType extends string> {
  seed: number;
  /** 轮换序列；长度 1 就等于不轮换 */
  order: readonly TType[];
  label: Record<TType, string>;
  fetcher: (type: TType) => Promise<StaticAssetList<TType>>;
  /** cover 铺满裁切，fit 按贴图比例居中放大，tiles 一排圆形 */
  layout: 'cover' | 'fit' | 'tiles';
}

function AssetDeck<TType extends string>({ seed, order, label, fetcher, layout }: DeckProps<TType>) {
  const [picks, setPicks] = useState<StaticAssetItem[]>([]);
  const [failed, setFailed] = useState(false);
  const type = order[seed % order.length] as TType;

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧列表覆盖新列表
    let ignore = false;
    void (async () => {
      try {
        const next = await fetcher(type);
        if (ignore) return;
        // 抽之前先打乱，连点同一类也不会反复看到同一批
        const shuffled = [...next.items].sort(() => Math.random() - 0.5);
        setPicks(shuffled.slice(0, layout === 'cover' ? 1 : TILE_COUNT));
        setFailed(false);
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
    // fetcher / layout 都是模块级常量，依赖里只留真正会变的
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, seed]);

  const caption = failed
    ? `${label[type]}资源取不到（500）`
    : picks.length === 0
      ? `正在取${label[type]}资源…`
      : label[type];

  if (layout === 'tiles') {
    return (
      <div className="plaza-demo-tiles">
        {picks.map((item) => (
          <span key={item.id} className="plaza-demo-tile">
            {/* 站内静态资源，原生 img 足够；换 next/image 还得为将来的 CDN 再配一次域名 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="plaza-demo-tile-img" src={item.url} alt="" decoding="async" loading="lazy" />
          </span>
        ))}
        <span className="plaza-demo-tiles-badge">{caption}</span>
      </div>
    );
  }

  return (
    <div className={`plaza-demo-photo${layout === 'fit' ? ' plaza-demo-photo--fit' : ''}`}>
      {picks[0] && (
        // 站内静态资源，原生 img 足够；换 next/image 还得为将来的 CDN 再配一次域名
        // eslint-disable-next-line @next/next/no-img-element
        <img className="plaza-demo-photo-img" src={picks[0].url} alt="" decoding="async" />
      )}
      <span className="plaza-demo-photo-caption">{caption}</span>
    </div>
  );
}

const EMOJI_LABEL: Record<EmojiType, string> = { menhera: 'menhera 表情包' };
const AVATAR_LABEL: Record<AvatarType, string> = { boy: '男生头像', girl: '女生头像', anime: '动漫头像' };
const IMAGE_LABEL: Record<ImageType, string> = { beauty: 'beauty 图片', pretty: 'pretty 图片' };

export function EmojiDemo({ seed }: DemoProps) {
  return (
    <AssetDeck<EmojiType>
      seed={seed}
      order={['menhera']}
      label={EMOJI_LABEL}
      layout="fit"
      fetcher={(type) => fetchEmoji(type)}
    />
  );
}

export function AvatarDemo({ seed }: DemoProps) {
  return (
    <AssetDeck<AvatarType>
      seed={seed}
      order={['boy', 'girl', 'anime']}
      label={AVATAR_LABEL}
      layout="tiles"
      fetcher={(type) => fetchAvatars(type)}
    />
  );
}

export function ImageDemo({ seed }: DemoProps) {
  return (
    <AssetDeck<ImageType>
      seed={seed}
      order={['beauty', 'pretty']}
      label={IMAGE_LABEL}
      layout="cover"
      fetcher={(type) => fetchImages(type)}
    />
  );
}
