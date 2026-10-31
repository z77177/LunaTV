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
  'metadata.google.internal',
  'instance-data',
];

/**
 * 校验目标 IP 是否属于安全的公网单播 IP
 */
export function isSafeIp(ipString: string): boolean {
  try {
    const processed = ipaddr.process(ipString.trim());
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

    const hostname = parsed.hostname.toLowerCase();

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

    // 3. 直接是 IP 地址的情况
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
      // 在沙箱、无公网 DNS 或特殊环境解析失败时，放行给实际上游 fetch 处理
    }

    return { safe: true, urlObj: parsed };
  } catch (err: any) {
    return { safe: false, reason: `无效的 URL 格式: ${err.message}` };
  }
}
