/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { resetConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  let auth;
  try {
    auth = await ensureAdmin(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.role !== 'owner') {
    return NextResponse.json({ error: '仅支持站长重置配置' }, { status: 403 });
  }

  try {
    await resetConfig();

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store', // 管理员配置不缓存
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: '重置管理员配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// 废弃旧版 GET 请求，防止 CSRF 攻击导致配置被恶意重置
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed. 请使用 POST 方法并附带合法站长认证凭据。' },
    { status: 405 }
  );
}
