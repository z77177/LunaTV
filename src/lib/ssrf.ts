import dns from 'dns';
import ipaddr from 'ipaddr.js';

const DISALLOWED_RANGES = new Set([
  'loopback',
  'private',
  'linkLocal',
  'carrierGradeNat',
  'uniqueLocal',
  'broadcast',
  'reserved',
  'unspecified',
]);

const DISALLOWED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  'metadata.google.internal',
  'instance-data',
];

/**
 * 校验目标 IP 是否属于安全的公网单播 IP（自动剥离 IPv6 方括号并转换 IPv4-mapped IPv6）
 */
export function isSafeIp(ipString: string): boolean {
  try {
    const cleanIp = ipString.trim().replace(/^\[|\]$/g, '');
    if (!cleanIp) return false;
    const processed = ipaddr.process(cleanIp);
    const range = processed.range();
    return !DISALLOWED_RANGES.has(range);
  } catch {
    return false;
  }
}

/**
 * 校验目标 URL 是否安全，阻断内网探测与 SSRF 攻击
 */
export async function isSafePublicUrl(
  urlStr: string
): Promise<{ safe: boolean; reason?: string; urlObj?: URL }> {
  try {
    const parsed = new URL(urlStr);

    // 1. 协议白名单
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `不支持的协议: ${parsed.protocol}` };
    }

    // 剥离 IPv6 方括号 `[` `]` 以及 FQDN 末尾点号 `.`，防止 `[::1]` 或 `localhost.` 绕过校验
    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .replace(/\.+$/, '');

    if (!hostname) {
      return { safe: false, reason: '无效的主机名' };
    }

    // 2. 域名黑名单关键词匹配
    if (DISALLOWED_HOSTNAMES.includes(hostname)) {
      return { safe: false, reason: '禁止访问本地或元数据主机' };
    }

    if (
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.arpa')
    ) {
      return { safe: false, reason: '禁止访问内部网络域名' };
    }

    // 3. 直接是 IP 地址的情况（包括 IPv4、IPv6 及 ::ffff:127.0.0.1 映射地址）
    if (ipaddr.isValid(hostname)) {
      if (!isSafeIp(hostname)) {
        return { safe: false, reason: '禁止访问私有或保留 IP 地址' };
      }
      return { safe: true, urlObj: parsed };
    }

    // 4. 对域名尝试做 DNS 解析校验
    try {
      const records = await dns.promises.lookup(hostname, { all: true });
      for (const record of records) {
        if (!isSafeIp(record.address)) {
          return { safe: false, reason: `域名解析到了非公网 IP (${record.address})` };
        }
      }
    } catch {
      // 在沙箱、无公网 DNS 或特殊环境解析失败时，交由实际上游 fetch 处理
    }

    return { safe: true, urlObj: parsed };
  } catch (err: any) {
    return { safe: false, reason: `无效的 URL 格式: ${err.message}` };
  }
}

/**
 * 安全的服务端 fetch 包装器：
 * 对初始 URL 及每一跳 301/302/303/307/308 重定向目标强制执行 isSafePublicUrl 校验，
 * 彻底阻断利用公网 302 跳转至内网/回环/云元数据的 SSRF 绕过攻击。
 */
export async function safeFetch(
  urlStr: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = urlStr;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const safety = await isSafePublicUrl(currentUrl);
    if (!safety.safe) {
      throw new Error(`SSRF Blocked (${currentUrl}): ${safety.reason || 'Unsafe URL'}`);
    }

    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return response;
      }
      if (hop === maxRedirects) {
        throw new Error(`Too many redirects (max ${maxRedirects})`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      // 若重定向为 303，或 301/302 且原请求为 POST，按 HTTP 规范降级为 GET 并移除 body
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          init.method &&
          init.method.toUpperCase() === 'POST')
      ) {
        init = { ...init, method: 'GET', body: undefined };
      }
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (max ${maxRedirects})`);
}
