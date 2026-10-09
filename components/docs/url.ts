/** 文档里的接口地址一律走这里拼装：写死域名会在换部署时失真 */
import { siteUrl } from '@/env';

export function apiOrigin(): string {
  return siteUrl().replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  return `${apiOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}
