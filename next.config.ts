import type { NextConfig } from 'next';

/**
 * App Router 页面与 app/api/** 都由 Next 自己服务；请求管线的鉴权/统计/异常在 lib/server/handler.ts 的 withApiHandler 里。
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 允许通过环境变量配置的图片域名（占位：后续接入真实 CDN 时启用）
  images: {
    remotePatterns: (() => {
      const host = process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOST;
      return host ? [{ protocol: 'https' as const, hostname: host }] : [];
    })(),
  },

  /**
   * public/ 默认按 max-age=0 出网，23MB 素材每次浏览都要回源验证一遍。
   * 素材文件名不随内容改动（bing 镜像只追加新文件），所以图片可以给 immutable；
   * json 语料会原地更新，只给短缓存 + SWR。
   */
  headers: async () => [
    {
      source: '/assets/:dir(wallpaper|wallpaper-thumb|images|images-thumb|avatar|avatar-thumb|emoji|emoji-thumb)/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/assets/json/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' }],
    },
  ],

  eslint: {
    // 生产构建继续执行 lint：保持质量门禁
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
