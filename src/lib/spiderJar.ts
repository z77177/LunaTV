/*
 * Robust spider.jar provider
 * - Sequentially tries remote candidates
 * - Caches successful jar (memory) for TTL
 * - Provides minimal fallback jar when all fail (still 200 to avoid TVBox unreachable)
 */
import crypto from 'crypto';

// Remote jar candidates (order by stability). Update list as needed.
const CANDIDATES: string[] = [
  'https://cdn.jsdelivr.net/gh/FongMi/CatVodSpider@main/jar/custom_spider.jar',
  'https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
  'https://ghproxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
  'https://gitcode.net/qq_26898231/TVBox/-/raw/main/JAR/XC.jar',
];

// Minimal valid JAR (ZIP) with MANIFEST.MF (base64)
// Generated from: jar cfe empty.jar (with basic manifest) minimized.
const FALLBACK_JAR_BASE64 =
  'UEsDBBQAAAAIAI2JZFMAAAAAAAAAAAAAAAAJAAAATUVUQS1JTkYvUEsDBBQAAAAIAI2JZFN2y5eRAAAAACAAAAAUAAAATUVUQS1JTkYvTUFOSUZFU1QuTUZNYW5pZmVzdC1WZXJzaW9uOiAxLjAKCkNyZWF0ZWQtQnk6IEx1bmFUViBGYWxsYmFjawpQS' +
  'sHCO8JVu8/AAAAOAAAAFBLAQIUABQAAAAIAI2JZFMA7wlW7z8AAABOAAAAJAAAAAAAAAAAAAAAAAAAAAAATUVUQS1JTkYvUEsBAhQAFAAAAAgAjYlkU3bLl5EAAAAAIAAAABQAAAAAAAAAAAAAAAADgAAABNRVRBLUlORi9NQU5JRkVTVC5NRlBLBQYAAAAAAgACAHAAAABNAAAAAAA=';

export interface SpiderJarInfo {
  buffer: Buffer;
  md5: string;
  source: string; // url or 'fallback'
  success: boolean; // true if fetched real remote jar
  cached: boolean;
  timestamp: number;
  size: number;
  tried: number; // number of candidates tried until success/fallback
}

let cache: SpiderJarInfo | null = null;
const TTL = 6 * 60 * 60 * 1000; // 6h

async function fetchRemote(
  url: string,
  timeoutMs = 10000
): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    // 先用 HEAD 检查文件是否存在
    const headResp = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!headResp.ok || headResp.status >= 400) {
      clearTimeout(id);
      return null;
    }

    // 文件存在，获取完整内容
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(id);

    if (!resp.ok || resp.status >= 400) return null;
    const ab = await resp.arrayBuffer();
    if (ab.byteLength < 1000) return null; // jar 文件应该至少 1KB

    return Buffer.from(ab);
  } catch (error) {
    console.warn(`[SpiderJar] Failed to fetch ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

function md5(buf: Buffer): string {
  return crypto.createHash('md5').update(buf).digest('hex');
}

export async function getSpiderJar(
  forceRefresh = false
): Promise<SpiderJarInfo> {
  const now = Date.now();
  if (!forceRefresh && cache && now - cache.timestamp < TTL) {
    console.log('[SpiderJar] Using cached jar:', cache.source);
    return { ...cache, cached: true };
  }

  console.log('[SpiderJar] Cache expired or force refresh, probing candidates...');
  let tried = 0;
  for (const url of CANDIDATES) {
    tried += 1;
    console.log(`[SpiderJar] Trying candidate ${tried}: ${url}`);
    const buf = await fetchRemote(url);
    if (buf) {
      const info: SpiderJarInfo = {
        buffer: buf,
        md5: md5(buf),
        source: url,
        success: true,
        cached: false,
        timestamp: now,
        size: buf.length,
        tried,
      };
      cache = info;
      console.log(`[SpiderJar] Success! Cached jar from ${url} (${buf.length} bytes, md5: ${info.md5})`);
      return info;
    }
  }

  // fallback
  console.warn('[SpiderJar] All candidates failed, using fallback minimal jar');
  const fb = Buffer.from(FALLBACK_JAR_BASE64, 'base64');
  const info: SpiderJarInfo = {
    buffer: fb,
    md5: md5(fb),
    source: 'fallback',
    success: false,
    cached: false,
    timestamp: now,
    size: fb.length,
    tried,
  };
  cache = info; // still cache fallback to avoid hammering
  console.log(`[SpiderJar] Fallback jar cached (${fb.length} bytes, md5: ${info.md5})`);
  return info;
}

export function getSpiderStatus(): Omit<SpiderJarInfo, 'buffer'> | null {
  return cache ? { ...cache, buffer: undefined as any } : null;
}

export function getCandidates(): string[] {
  return [...CANDIDATES];
}
