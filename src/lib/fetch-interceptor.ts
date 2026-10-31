/**
 * 全局 Fetch 拦截器
 * 自动监控所有外部 API 请求的流量
 */

import { recordExternalTraffic } from './external-traffic-monitor';

// 保存原始的 fetch 函数
const originalFetch = global.fetch;
let isInterceptorInitialized = false;

const SENSITIVE_PARAM_REGEX = /([?&](?:api_key|apikey|key|token|secret|password|auth)=)[^&#]*/gi;

function sanitizeUrl(rawUrl: string): string {
  return rawUrl.replace(SENSITIVE_PARAM_REGEX, '$1***');
}

/**
 * 初始化全局 fetch 拦截器
 */
export function initFetchInterceptor() {
  // 只在服务端拦截，且防止重复嵌套包装
  if (typeof window !== 'undefined' || isInterceptorInitialized) {
    return;
  }
  isInterceptorInitialized = true;

  // 替换全局 fetch
  global.fetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const startTime = Date.now();
    const rawUrlString =
      typeof url === 'string'
        ? url
        : url instanceof URL
          ? url.toString()
          : url.url;
    const safeUrlString = sanitizeUrl(rawUrlString);

    // 计算请求大小
    let requestSize = 0;
    if (options?.body) {
      if (typeof options.body === 'string') {
        requestSize = Buffer.byteLength(options.body, 'utf8');
      } else if (options.body instanceof Buffer) {
        requestSize = options.body.length;
      }
    }

    try {
      // 执行原始 fetch
      const response = await originalFetch(url, options);

      // 仅通过 Content-Length 标头统计大小，严禁调用 response.clone().text() 全量缓冲流式/二进制响应
      const contentLengthHeader = response.headers.get('content-length');
      const parsedLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const responseSize = Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : 0;

      // 记录外部流量
      recordExternalTraffic({
        timestamp: startTime,
        url: safeUrlString,
        method: options?.method || 'GET',
        requestSize,
        responseSize,
        duration: Date.now() - startTime,
        statusCode: response.status,
      });

      return response;
    } catch (error) {
      // 即使失败也记录
      recordExternalTraffic({
        timestamp: startTime,
        url: safeUrlString,
        method: options?.method || 'GET',
        requestSize,
        responseSize: 0,
        duration: Date.now() - startTime,
        statusCode: 0,
      });

      throw error;
    }
  };

  console.log('✅ 全局 Fetch 拦截器已启动，开始监控外部流量');
}
