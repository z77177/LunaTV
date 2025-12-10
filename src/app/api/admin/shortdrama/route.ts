/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { clearConfigCache, getConfig } from '@/lib/config';
import { verifyAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { primaryApiUrl, alternativeApiUrl, enableAlternative } = body;

    // 验证必填字段
    if (!primaryApiUrl) {
      return NextResponse.json(
        { error: '主API地址不能为空' },
        { status: 400 }
      );
    }

    if (enableAlternative && !alternativeApiUrl) {
      return NextResponse.json(
        { error: '启用备用API时必须提供备用API地址' },
        { status: 400 }
      );
    }

    // 获取当前配置
    const config = await getConfig();

    // 更新短剧配置
    config.ShortDramaConfig = {
      primaryApiUrl: primaryApiUrl.trim(),
      alternativeApiUrl: alternativeApiUrl.trim(),
      enableAlternative: !!enableAlternative,
    };

    // 保存到数据库
    await db.saveAdminConfig(config);

    // 清除配置缓存
    clearConfigCache();

    return NextResponse.json({
      success: true,
      message: '短剧API配置已更新',
    });
  } catch (error) {
    console.error('保存短剧配置失败:', error);
    return NextResponse.json(
      { error: '保存失败，请重试' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const config = await getConfig();

    return NextResponse.json({
      success: true,
      config: config.ShortDramaConfig || {
        primaryApiUrl: 'https://api.r2afosne.dpdns.org',
        alternativeApiUrl: '',
        enableAlternative: false,
      },
    });
  } catch (error) {
    console.error('获取短剧配置失败:', error);
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    );
  }
}
