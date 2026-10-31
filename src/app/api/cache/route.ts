import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

const FORBIDDEN_CACHE_PREFIXES = ['telegram_token:', 'oidc_'];

function isForbiddenCacheKey(keyOrPrefix: string): boolean {
  const normalized = keyOrPrefix.trim().toLowerCase();
  return FORBIDDEN_CACHE_PREFIXES.some((p) => normalized.startsWith(p));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (isForbiddenCacheKey(key)) {
      return NextResponse.json({ error: 'Forbidden cache key' }, { status: 403 });
    }

    // 私有会话历史缓存归属检查
    if (key.startsWith('ai-recommend-history-')) {
      const authInfo = getAuthInfoFromCookie(request);
      if (!authInfo || !authInfo.username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const targetUser = key.replace('ai-recommend-history-', '');
      if (
        authInfo.username !== targetUser &&
        authInfo.role !== 'owner' &&
        authInfo.role !== 'admin'
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data = await db.getCache(key);
    return NextResponse.json({ data });
  } catch (error) {
    console.error(`❌ API缓存错误 (key: ${request.nextUrl.searchParams.get('key')}):`, error);
    return NextResponse.json({ data: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 禁止访客写入共享缓存
    if (authInfo.isGuest) {
      return NextResponse.json({ error: 'Guest cannot write cache' }, { status: 403 });
    }

    const body = await request.json();
    const { key, data, expireSeconds } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    if (isForbiddenCacheKey(key)) {
      return NextResponse.json({ error: 'Forbidden cache key' }, { status: 403 });
    }

    // 私有历史缓存写入归属校验
    if (key.startsWith('ai-recommend-history-')) {
      const targetUser = key.replace('ai-recommend-history-', '');
      if (
        authInfo.username !== targetUser &&
        authInfo.role !== 'owner' &&
        authInfo.role !== 'admin'
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const ttl = Math.min(Math.max(Number(expireSeconds) || 3600, 1), 86400 * 30);
    await db.setCache(key, data, ttl);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API缓存写入失败:', error);
    return NextResponse.json({ error: 'Failed to set cache' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    try {
      await ensureAdmin(request);
    } catch {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const prefix = searchParams.get('prefix');

    if (prefix) {
      if (isForbiddenCacheKey(prefix)) {
        return NextResponse.json({ error: 'Forbidden cache prefix' }, { status: 403 });
      }
      await db.clearExpiredCache(prefix);
    } else if (key) {
      if (isForbiddenCacheKey(key)) {
        return NextResponse.json({ error: 'Forbidden cache key' }, { status: 403 });
      }
      await db.deleteCache(key);
    } else {
      return NextResponse.json({ error: 'Key or prefix is required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete cache error:', error);
    return NextResponse.json({ error: 'Failed to delete cache' }, { status: 500 });
  }
}
