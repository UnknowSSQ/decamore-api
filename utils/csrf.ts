/** CSRF 判定：双提交 Cookie 的完整规则，纯函数便于把「何时必须带」这条讲清楚 */
interface CsrfDecisionInput {
  /** 这次请求是否要求 CSRF 校验：调用方按「route 显式指定，否则写方法默认开启」算好再传进来 */
  required: boolean;
  /** 令牌是从 Authorization 头来的还是从 Cookie 来的 */
  viaHeader: boolean;
  /** 请求带的 X-CSRF-Token 头 */
  header: string | null;
  /** 服务端下发的 csrf Cookie 值 */
  cookie: string | null;
}

type CsrfDecision = { verdict: 'skip' | 'pass' | 'fail'; reason?: string };

/**
 * Bearer 头发起的请求不具备「浏览器自动带上凭据」这个属性，跨站脚本伪造不出该头，
 * 所以只有 cookie 会话需要双提交。此前实现是「没带 Cookie 就跳过」，等于把缺失当通过；
 * 现在 cookie 会话下缺 Token 或缺 Cookie 一律判失败。
 */
export function csrfDecision(input: CsrfDecisionInput): CsrfDecision {
  if (!input.required) return { verdict: 'skip' };
  if (input.viaHeader) return { verdict: 'skip' };

  if (!input.cookie) return { verdict: 'fail', reason: '会话缺少 CSRF Cookie，请重新登录' };
  if (!input.header) return { verdict: 'fail', reason: '缺少 X-CSRF-Token 请求头' };
  if (input.header !== input.cookie) return { verdict: 'fail', reason: 'X-CSRF-Token 与会话 Cookie 不匹配' };

  return { verdict: 'pass' };
}
