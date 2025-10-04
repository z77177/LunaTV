import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Spider JAR 本地代理端点 - 解决外部jar 404问题
export async function GET(_req: NextRequest) {
  try {
    // 多个备用spider jar源（按优先级排序）
    const spiderJarUrls = [
      'https://cdn.jsdelivr.net/gh/FongMi/CatVodSpider@main/jar/custom_spider.jar',
      'https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      'https://ghproxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      'https://gitcode.net/qq_26898231/TVBox/-/raw/main/JAR/XC.jar',
    ];

    let lastError: Error | null = null;

    // 依次尝试每个jar源
    for (const jarUrl of spiderJarUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

        const response = await fetch(jarUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // 直接转发jar文件内容
          const jarBuffer = await response.arrayBuffer();

          console.log(`[Spider Proxy] 成功代理 ${jarUrl}, 大小: ${jarBuffer.byteLength} bytes`);

          return new NextResponse(jarBuffer, {
            headers: {
              'Content-Type': 'application/java-archive',
              'Content-Length': jarBuffer.byteLength.toString(),
              'Cache-Control': 'public, max-age=3600', // 1小时缓存
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[Spider Proxy] ${jarUrl} 失败:`, lastError.message);
        continue;
      }
    }

    // 所有源都失败，返回错误
    console.error('[Spider Proxy] 所有spider jar源均不可用');
    return NextResponse.json(
      {
        error: 'Spider JAR not available',
        message: '所有spider jar源均不可用，请稍后再试',
        tried: spiderJarUrls,
        lastError: lastError?.message || 'Unknown error',
      },
      { status: 502 }
    );
  } catch (error) {
    console.error('[Spider Proxy] 代理错误:', error);
    return NextResponse.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
