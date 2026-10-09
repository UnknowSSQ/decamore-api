import type { NextConfig } from 'next';

/**
 * Next.js 配置
 * - 项目使用 App Router + 严格 TypeScript
 * - 后端 API 骨架位于 app/api/**，由 lib/server 中间件统一处理鉴权/统计/异常
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

  // 构建期不因未接入数据库而失败：仅提示未使用 experimental 特性
  experimental: {
    // 需要更严格的 serverActions 安全校验时打开
    // serverActions: { bodySizeLimit: '1mb' },
  },

  eslint: {
    // 生产构建继续执行 lint：保持质量门禁
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
