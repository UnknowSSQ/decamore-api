'use client';
/** 三种静态资源演示共用 AssetDeck，差异只在 order / label / layout。
 *  列表服务端缓存 10 分钟，但每次点击都重新抽资源，画面确实会变 */
import { useEffect, useState } from 'react';

import { LazyImage } from '@/components/shared/LazyImage';
import { fetchAvatars, fetchEmoji, fetchImages } from '@/lib/api';
import type { AvatarType, EmojiType, ImageType, StaticAssetItem, StaticAssetList } from '@/types';
import type { DemoProps } from './types';

const TILE_COUNT = 6;

interface DeckProps<TType extends string> {
  seed: number;
  /** 轮换序列；长度 1 就等于不轮换 */
  order: readonly TType[];
  label: Record<TType, string>;
  /** limit 由版式决定：tiles 一排 6 张，cover / fit 只用 1 张 */
  fetcher: (type: TType, limit: number) => Promise<StaticAssetList<TType>>;
  /** cover 铺满裁切，fit 按贴图比例居中放大，tiles 一排圆形 */
  layout: 'cover' | 'fit' | 'tiles';
}

function AssetDeck<TType extends string>({ seed, order, label, fetcher, layout }: DeckProps<TType>) {
  const [picks, setPicks] = useState<StaticAssetItem[]>([]);
  const [failed, setFailed] = useState(false);
  const type = order[seed % order.length] as TType;
  const want = layout === 'tiles' ? TILE_COUNT : 1;

  useEffect(() => {
    // 快速连点时丢弃过期响应，避免后到的旧列表覆盖新列表
    let ignore = false;
    void (async () => {
      try {
        // 随机取样交给服务端：只要 want 条，不必把整个目录拉下来再挑
        const next = await fetcher(type, want);
        if (ignore) return;
        setPicks(next.items);
        setFailed(false);
      } catch {
        if (!ignore) setFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
    // fetcher / want 由版式决定，依赖里只留真正会变的
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
            <LazyImage className="plaza-demo-tile-img" src={item.thumbUrl ?? item.url} alt="" />
          </span>
        ))}
        <span className="plaza-demo-tiles-badge">{caption}</span>
      </div>
    );
  }

  return (
    <div className={`plaza-demo-photo${layout === 'fit' ? ' plaza-demo-photo--fit' : ''}`}>
      {picks[0] && <LazyImage className="plaza-demo-photo-img" src={picks[0].thumbUrl ?? picks[0].url} alt="" />}
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
      fetcher={(type, limit) => fetchEmoji(type, limit)}
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
      fetcher={(type, limit) => fetchAvatars(type, limit)}
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
      fetcher={(type, limit) => fetchImages(type, limit)}
    />
  );
}
