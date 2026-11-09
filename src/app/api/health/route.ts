import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { getClientIP } from '@/lib/networkDetection';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { CURRENT_VERSION } from '@/lib/version';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // IP 频控保护（单个 IP 每分钟最多 60 次探针探测）
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit(clientIP, 'health', 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit, '健康巡检请求过于频繁');
  }

  const startTime = Date.now();
  let dbStatus = 'ok';
  let latencyMs = 0;

  try {
    if (db.isStatsSupported()) {
      const pingStart = Date.now();
      await db.getCache('__health_ping__');
      latencyMs = Date.now() - pingStart;
    }
  } catch (err) {
    dbStatus = 'degraded';
    console.error('[Health] 数据库探测异常:', err);
  }

  const memory = process.memoryUsage();
  const uptime = Math.floor(process.uptime());
  const isHealthy = dbStatus === 'ok';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: CURRENT_VERSION,
      uptime,
      storage: {
        type: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
        status: dbStatus,
        latencyMs,
      },
      memory: {
        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        rssMB: Math.round(memory.rss / 1024 / 1024),
      },
      responseTimeMs: Date.now() - startTime,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
