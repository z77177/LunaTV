import { NextResponse } from 'next/server';

import { db } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // 毫秒级时间戳
  limit: number;
}

interface MemoryLimitEntry {
  count: number;
  expireAt: number;
}

// 进程级内存回退缓存（用于 localstorage 单机模式或 Redis 离线容灾）
const memoryCache = new Map<string, MemoryLimitEntry>();

function cleanMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expireAt <= now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * 校验指定动作与 IP 的请求频率（固定窗口算法）
 * @param ip 客户端 IP
 * @param action 业务动作名称，如 'login' | 'register' | 'tvbox'
 * @param limit 时间窗口内最大允许请求数
 * @param windowMs 时间窗口大小（毫秒）
 */
export async function checkRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const safeIp = ip && ip.trim() ? ip.trim() : 'unknown';
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetTime = windowStart + windowMs;
  const key = `rl:${action}:${safeIp}:${windowStart}`;
  const expireSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

  // 1. 若配置了 Redis/Upstash/Kvrocks 数据库，优先使用分布式缓存
  try {
    if (db.isStatsSupported()) {
      const current = await db.getCache(key);
      const currentCount = typeof current === 'number' ? current : Number(current) || 0;

      if (currentCount >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          limit,
        };
      }

      const newCount = currentCount + 1;
      await db.setCache(key, newCount, expireSeconds);

      return {
        allowed: true,
        remaining: Math.max(0, limit - newCount),
        resetTime,
        limit,
      };
    }
  } catch (dbErr) {
    console.warn(`[RateLimit] 分布式存储查询异常 (${action}:${safeIp})，自动降级至内存缓存:`, dbErr);
  }

  // 2. 降级模式：单机进程内存 Map 缓存
  try {
    if (memoryCache.size > 5000) {
      cleanMemoryCache();
    }

    const existing = memoryCache.get(key);
    const currentCount = existing && existing.expireAt > now ? existing.count : 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit,
      };
    }

    const newCount = currentCount + 1;
    memoryCache.set(key, { count: newCount, expireAt: resetTime });

    return {
      allowed: true,
      remaining: Math.max(0, limit - newCount),
      resetTime,
      limit,
    };
  } catch (memErr) {
    console.error(`[RateLimit] 内存缓存处理异常:`, memErr);
    // Fail-open 策略，确保不阻断正常业务
    return {
      allowed: true,
      remaining: 1,
      resetTime,
      limit,
    };
  }
}

/**
 * 生成符合 RFC 规范的 429 请求过多响应
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message = '请求过于频繁，请稍后再试'
): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: message,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      },
    }
  );
}

/**
 * 清空内存缓存（供单元测试使用）
 */
export function _resetMemoryRateLimitCache(): void {
  memoryCache.clear();
}
