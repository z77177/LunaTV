import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { isSafePublicUrl, safeFetch } from '@/lib/ssrf';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await ensureAdmin(request);
  } catch {
    return NextResponse.json(
      { success: false, error: '无权限执行此操作' },
      { status: 403 }
    );
  }

  try {
    const { serverUrl, authKey } = await request.json();

    if (!serverUrl) {
      return NextResponse.json(
        { success: false, error: '服务器地址不能为空' },
        { status: 400 }
      );
    }

    // 请求统计信息
    const statsUrl = `${serverUrl.replace(/\/$/, '')}/stats`;

    // 校验目标 URL 安全性，防止 SSRF 探测内网
    const safeCheck = await isSafePublicUrl(statsUrl);
    if (!safeCheck.safe) {
      return NextResponse.json(
        { success: false, error: '禁止访问该服务器地址 (SSRF Protection)' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await safeFetch(statsUrl, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `服务器返回错误: HTTP ${response.status}`,
        });
      }

      const stats = await response.json();

      return NextResponse.json({
        success: true,
        data: stats,
      });
    } catch (fetchError: any) {
      clearTimeout(timeout);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '请求超时（10秒）',
        });
      }

      return NextResponse.json({
        success: false,
        error: `无法连接到服务器: ${fetchError.message}`,
      });
    }
  } catch (error: any) {
    console.error('获取统计信息失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取统计信息失败' },
      { status: 500 }
    );
  }
}
