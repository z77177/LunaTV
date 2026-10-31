import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { setTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { telegramUsername } = await request.json();

    if (!telegramUsername || typeof telegramUsername !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的 Telegram 用户名' },
        { status: 400 }
      );
    }

    const normalizedUsername = telegramUsername.trim().replace(/^@/, '').toLowerCase();
    if (!normalizedUsername) {
      return NextResponse.json(
        { error: '请提供有效的 Telegram 用户名' },
        { status: 400 }
      );
    }

    // 获取管理员配置
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled) {
      return NextResponse.json(
        { error: 'Telegram 登录未启用' },
        { status: 403 }
      );
    }

    if (!telegramConfig.botToken) {
      return NextResponse.json(
        { error: 'Bot Token 未配置' },
        { status: 500 }
      );
    }

    // 生成随机 token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟过期

    // 获取当前请求的域名（优先环境变量配置，严格校验 Host 头防止注入）
    let baseUrl = process.env.SITE_BASE || process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      const rawProto = request.headers.get('x-forwarded-proto') || 'https';
      const protocol = rawProto === 'http' ? 'http' : 'https';
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost';
      const safeHost = /^[a-zA-Z0-9.-]+(:\d+)?$/.test(host) ? host : 'localhost';
      baseUrl = `${protocol}://${safeHost}`;
    }

    // 存储 token 到数据库（初始为未验证状态，必须由 Telegram Webhook 确认）
    const tokenData = {
      telegramUsername: normalizedUsername,
      expiresAt,
      baseUrl,
      verified: false,
    };

    await setTelegramToken(token, tokenData);

    // 生成 Telegram 深度链接
    const botUsername = telegramConfig.botUsername;
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    // 返回深度链接给前端
    return NextResponse.json({
      success: true,
      deepLink: deepLink,
      botUsername: botUsername,
    });
  } catch (error) {
    console.error('Magic link send error:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
