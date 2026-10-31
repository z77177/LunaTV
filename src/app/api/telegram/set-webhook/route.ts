import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { isSafePublicUrl } from '@/lib/ssrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 设置 Telegram Webhook
export async function POST(request: NextRequest) {
  try {
    await ensureAdmin(request);
  } catch {
    return NextResponse.json({ error: '无权操作' }, { status: 403 });
  }

  try {
    // 获取管理员配置
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled || !telegramConfig.botToken) {
      return NextResponse.json(
        { error: 'Telegram 未配置' },
        { status: 400 }
      );
    }

    // 构建 webhook URL - 只使用当前访问的域名
    const host = request.headers.get('host');
    if (!host) {
      return NextResponse.json(
        { error: '无法获取当前域名' },
        { status: 400 }
      );
    }

    const protocol = request.headers.get('x-forwarded-proto') ||
                     (host.includes('localhost') ? 'http' : 'https');
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

    // 校验目标 URL 安全性
    const safeCheck = await isSafePublicUrl(webhookUrl);
    if (!safeCheck.safe) {
      return NextResponse.json(
        { error: '非法的 Webhook 域名' },
        { status: 400 }
      );
    }

    console.log('[Set Webhook] Setting webhook to:', webhookUrl);

    // 调用 Telegram API 设置 webhook
    const response = await fetch(
      `https://api.telegram.org/bot${telegramConfig.botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'],
        }),
      }
    );

    const result = await response.json();

    console.log('[Set Webhook] Response:', result);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: `Webhook 设置成功：${webhookUrl}`,
        result: result,
      });
    } else {
      return NextResponse.json(
        { error: result.description || 'Webhook 设置失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Set Webhook] Error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 获取 Webhook 信息
export async function GET(request: NextRequest) {
  try {
    await ensureAdmin(request);
  } catch {
    return NextResponse.json({ error: '无权操作' }, { status: 403 });
  }

  try {
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled || !telegramConfig.botToken) {
      return NextResponse.json(
        { error: 'Telegram 未配置' },
        { status: 400 }
      );
    }

    // 获取 webhook 信息
    const response = await fetch(
      `https://api.telegram.org/bot${telegramConfig.botToken}/getWebhookInfo`
    );

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Get Webhook] Error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
