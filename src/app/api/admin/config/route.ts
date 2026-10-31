/* eslint-disable no-console */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getAdminRoleFromRequest } from '@/lib/admin-auth';
import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    let safeConfig = config;

    // 非站长管理员脱敏站长专属敏感凭证
    if (role !== 'owner') {
      safeConfig = JSON.parse(JSON.stringify(config));
      if (safeConfig.TelegramAuthConfig?.botToken) {
        safeConfig.TelegramAuthConfig.botToken = '******';
      }
      if (safeConfig.OIDCAuthConfig?.clientSecret) {
        safeConfig.OIDCAuthConfig.clientSecret = '******';
      }
      if (Array.isArray(safeConfig.OIDCProviders)) {
        safeConfig.OIDCProviders = safeConfig.OIDCProviders.map((p: any) => ({
          ...p,
          clientSecret: p.clientSecret ? '******' : '',
        }));
      }
      if (safeConfig.AIRecommendConfig?.apiKey) {
        safeConfig.AIRecommendConfig.apiKey = '******';
      }
    }

    const result: AdminConfigResult = {
      Role: role,
      Config: safeConfig,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store', // 管理员配置不缓存
      },
    });
  } catch (error) {
    console.error('获取管理员配置失败:', error);
    return NextResponse.json(
      {
        error: '获取管理员配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

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

  const role = await getAdminRoleFromRequest(request);
  if (role !== 'owner') {
    return NextResponse.json(
      { error: '只有站长可以修改配置' },
      { status: 403 }
    );
  }

  try {
    const newConfig: AdminConfig = await request.json();

    // 保存新配置
    await db.saveAdminConfig(newConfig);

    // 清除缓存，强制下次重新从数据库读取
    clearConfigCache();

    // 🔥 刷新所有页面的缓存，使新配置立即生效（无需重启Docker）
    revalidatePath('/', 'layout');

    // 🔥 添加 no-cache headers，防止 Docker 环境下 Next.js Router Cache 问题
    // 参考：https://github.com/vercel/next.js/issues/61184
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('保存管理员配置失败:', error);
    return NextResponse.json(
      {
        error: '保存配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
