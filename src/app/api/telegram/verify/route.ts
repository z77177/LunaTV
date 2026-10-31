import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_MAX_AGE_DAYS, generateSignature } from '@/lib/auth';
import { clearConfigCache } from '@/lib/config';
import { db } from '@/lib/db';
import { getTelegramToken, verifyAndConsumeTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 生成随机密码
function generatePassword(length = 8): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const confirm = searchParams.get('confirm');

    if (!token) {
      return new NextResponse(
        `<html><body><h1>无效的登录链接</h1><p>缺少 token 参数</p></body></html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // 如果没有 confirm 参数，先验证 token 是否有效且已通过 Telegram 确认（但不删除），然后显示确认页面
    if (!confirm) {
      const tokenData = await getTelegramToken(token);

      if (!tokenData || !tokenData.verified) {
        return new NextResponse(
          `<html><body><h1>登录链接无效或尚未确认</h1><p>请先在 Telegram 机器人中点击 Start 确认登录，或链接可能已过期</p></body></html>`,
          {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      const safeBaseUrl = escapeHtml(tokenData.baseUrl || '布鲁克林影视');
      const safeToken = encodeURIComponent(token);

      // 返回确认页面（防止 Telegram 链接预览消费 token）
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>确认登录</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
      margin: 1rem;
    }
    h1 {
      color: #333;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    p {
      color: #666;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 1rem 2rem;
      font-size: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    .btn:active {
      transform: translateY(0);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔐</div>
    <h1>Telegram 登录确认</h1>
    <p>点击下方按钮完成登录到 ${safeBaseUrl}</p>
    <a href="/api/telegram/verify?token=${safeToken}&confirm=1" class="btn">
      确认登录
    </a>
  </div>
</body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // 有 confirm 参数，真正消费 token 并登录（verifyAndConsumeTelegramToken 内部强制校验 verified === true）
    const tokenData = await verifyAndConsumeTelegramToken(token);

    if (!tokenData || !tokenData.verified) {
      return new NextResponse(
        `<html><body><h1>登录链接无效</h1><p>链接尚未在 Telegram 中确认、可能已过期或已被使用</p></body></html>`,
        {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    const { telegramUsername } = tokenData;

    // 获取管理员配置
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled) {
      return new NextResponse(
        `<html><body><h1>Telegram 登录未启用</h1></body></html>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // 构建用户名（格式：tg_username）
    const username = `tg_${telegramUsername}`;

    // 检查用户是否已存在
    let isNewUser = false;
    let initialPassword = '';
    const userExists = await db.checkUserExist(username);

    if (!userExists) {
      // 自动注册新用户
      if (telegramConfig.autoRegister) {
        initialPassword = generatePassword();
        await db.registerUser(username, initialPassword);
        clearConfigCache();
        isNewUser = true;
      } else {
        return new NextResponse(
          `<html><body><h1>用户不存在</h1><p>请先注册或联系管理员</p></body></html>`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }
    }

    // 查询实际用户角色（检查是否已被封禁）
    const userEntry = config?.UserConfig?.Users?.find((u) => u.username === username);
    if (userEntry?.banned) {
      return new NextResponse(
        `<html><body><h1>账号已被封禁</h1></body></html>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    const role: 'owner' | 'admin' | 'user' =
      username === process.env.USERNAME
        ? 'owner'
        : userEntry?.role === 'admin'
          ? 'admin'
          : 'user';

    // 生成认证数据对象（签署完整 username:role:timestamp 载荷防止提权）
    const authData: Record<string, any> = { role };
    if (username && process.env.PASSWORD) {
      const timestamp = Date.now();
      authData.username = username;
      authData.timestamp = timestamp;
      authData.loginTime = timestamp;
      const signPayload = `${username}:${role}:${timestamp}`;
      authData.signature = await generateSignature(signPayload, process.env.PASSWORD);
    }
    const authDataString = JSON.stringify(authData);

    const expires = new Date();
    expires.setDate(expires.getDate() + AUTH_COOKIE_MAX_AGE_DAYS);

    // 获取当前域名和协议
    const url = new URL(request.url);
    const isSecure = url.protocol === 'https:';

    // 记录登入时间
    try {
      await db.updateUserLoginStats(username, Date.now(), isNewUser);
    } catch {
      // 不影响登录流程
    }

    const newUserData = isNewUser && initialPassword ? JSON.stringify({ username, password: initialPassword }) : '';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>登录成功</title>
</head>
<body>
  <script>
    window.location.replace('/');
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

    response.cookies.set('user_auth', authDataString, {
      path: '/',
      expires: expires,
      sameSite: 'lax',
      secure: isSecure,
      httpOnly: false,
    });

    if (isNewUser && initialPassword) {
      const newUserExpires = new Date();
      newUserExpires.setSeconds(newUserExpires.getSeconds() + 60);
      response.cookies.set('telegram_new_user', newUserData, {
        path: '/',
        expires: newUserExpires,
        sameSite: 'lax',
        secure: isSecure,
        httpOnly: false,
      });
    }

    return response;
  } catch (error) {
    console.error('[Verify] ERROR:', error);
    return new NextResponse(
      `<html><body><h1>登录失败</h1><p>服务器错误，请稍后重试</p></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
