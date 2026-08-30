/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * 专为老旧设备（iOS 9+ Safari / VLC）打造的高兼容度 M3U8 与视频切片代理接口
 * 作用：
 * 1. 解决 HTTPS 网站加载 HTTP 视频源导致的浏览器混合内容拦截 (Mixed Content Blocking)
 * 2. 解决部分采集源的 CORS 跨域限制与防盗链 (403 Forbidden)
 * 3. 自动解析重写 M3U8 相对路径，确保全链路同源可播
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  let decodedUrl = '';
  try {
    decodedUrl = decodeURIComponent(targetUrl);
    new URL(decodedUrl);
  } catch {
    return NextResponse.json({ error: '无效的 URL 地址' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    };

    // 如果客户端发送了 Range 头，透传给上游
    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders['Range'] = range;
    }

    const response = await fetch(decodedUrl, {
      headers: upstreamHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      return new NextResponse(`上游媒体资源请求失败 (${response.status})`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 =
      decodedUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl');

    // 1. 如果是 M3U8 播放列表，读取并重写内部路径
    if (isM3U8) {
      const text = await response.text();
      const baseUrlObj = new URL(decodedUrl);
      const basePath = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

      const lines = text.split('\n');
      const rewrittenLines: string[] = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // 检查并重写 URI="xxx" 属性（如 EXT-X-KEY）
          if (trimmed.includes('URI="')) {
            line = line.replace(/URI="([^"]+)"/g, (_, keyUri) => {
              const fullKeyUrl = resolveAbsoluteUrl(keyUri, basePath, baseUrlObj.origin);
              const proxyKeyUrl = `/api/lite-stream?url=${encodeURIComponent(fullKeyUrl)}`;
              return `URI="${proxyKeyUrl}"`;
            });
          }
          rewrittenLines.push(line);
        } else {
          // 这是一个切片或二级 m3u8 地址
          const fullSegmentUrl = resolveAbsoluteUrl(trimmed, basePath, baseUrlObj.origin);
          const proxySegmentUrl = `/api/lite-stream?url=${encodeURIComponent(fullSegmentUrl)}`;
          rewrittenLines.push(proxySegmentUrl);
        }
      }

      const rewrittenM3U8 = rewrittenLines.join('\n');

      return new NextResponse(rewrittenM3U8, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. 如果是 TS 视频切片或二进制数据，流式透传
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set(
      'Content-Type',
      contentType || (decodedUrl.includes('.ts') ? 'video/mp2t' : 'video/mp4')
    );

    const contentLength = response.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);

    const contentRange = response.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[LiteStreamProxy Error]:', error);
    return new NextResponse(`代理流加载失败: ${error.message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * 辅助函数：将相对 URL 解析为完整绝对 URL
 */
function resolveAbsoluteUrl(uri: string, basePath: string, origin: string): string {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  if (uri.startsWith('//')) {
    return 'https:' + uri;
  }
  if (uri.startsWith('/')) {
    return origin + uri;
  }
  return basePath + uri;
}
