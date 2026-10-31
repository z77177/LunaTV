import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { getTelegramToken, setTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Telegram Webhook 端点
export async function POST(request: Request) {
  try {
    const update = await request.json();

    // 获取管理员配置
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled || !telegramConfig.botToken) {
      return NextResponse.json({ ok: true });
    }

    // 🛡️ 安全校验：如配置了 TELEGRAM_WEBHOOK_SECRET，校验官方密钥标头
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== webhookSecret) {
        console.warn('[Webhook] Unauthorized: invalid telegram secret token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 处理 /start 命令
    if (update.message?.text?.startsWith('/start ')) {
      const chatId = update.message.chat.id;
      const token = update.message.text.split(' ')[1]; // 获取 token

      // 从数据库验证 token
      const tokenData = await getTelegramToken(token);

      if (!tokenData) {
        await sendTelegramMessage(
          telegramConfig.botToken,
          chatId,
          '❌ 登录链接已过期或无效，请返回网站重新操作。'
        );
        return NextResponse.json({ ok: true });
      }

      // 🛡️ 核验发送 /start 命令的 Telegram 用户名是否与请求一致
      const senderUsername = (update.message.from?.username || '')
        .trim()
        .replace(/^@/, '')
        .toLowerCase();
      const expectedUsername = tokenData.telegramUsername
        .trim()
        .replace(/^@/, '')
        .toLowerCase();

      if (!senderUsername || senderUsername !== expectedUsername) {
        await sendTelegramMessage(
          telegramConfig.botToken,
          chatId,
          '❌ 账号验证失败：当前 Telegram 用户名与网页端申请登录的用户名不一致。'
        );
        return NextResponse.json({ ok: true });
      }

      // 标记 Token 已通过 Telegram 身份核验
      await setTelegramToken(token, {
        ...tokenData,
        verified: true,
      });

      // 生成登录链接 - 使用保存的域名（token 创建时保存的）
      const loginUrl = `${tokenData.baseUrl}/api/telegram/verify?token=${encodeURIComponent(token)}`;

      // 发送登录链接
      const message = `🔐 *登录到 ${config?.SiteConfig?.SiteName || '布鲁克林影视'}*\n\n点击下方链接完成登录：\n\n${loginUrl}\n\n⏰ 此链接将在 5 分钟后过期`;

      await sendTelegramMessage(
        telegramConfig.botToken,
        chatId,
        message
      );

      return NextResponse.json({ ok: true });
    }

    // 其他消息类型
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // 总是返回 ok 给 Telegram
  }
}

// 发送 Telegram 消息
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Webhook] Failed to send message:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error sending message:', error);
  }
}
