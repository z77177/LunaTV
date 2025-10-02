/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

// 生成签名
async function generateSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成认证Cookie（带签名）
async function generateAuthCookie(
  username?: string,
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  includePassword = false
): Promise<string> {
  const authData: any = { role: role || 'user' };

  // 只在需要时包含 password
  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    // 使用密码作为密钥对用户名进行签名
    const signature = await generateSignature(username, process.env.PASSWORD);
    authData.signature = signature;
    authData.timestamp = Date.now(); // 添加时间戳防重放攻击
  }

  return encodeURIComponent(JSON.stringify(authData));
}

export async function POST(req: NextRequest) {
  console.log('[注册] ========== 开始处理注册请求 ==========');
  try {
    // localStorage 模式不支持注册
    if (STORAGE_TYPE === 'localstorage') {
      console.log('[注册] localStorage 模式，拒绝注册');
      return NextResponse.json(
        { error: 'localStorage 模式不支持用户注册' },
        { status: 400 }
      );
    }

    const { username, password, confirmPassword } = await req.json();
    console.log(`[注册] 收到注册请求，用户名: ${username}`);

    // 先检查配置中是否允许注册（在验证输入之前）
    try {
      const config = await getConfig();
      const allowRegister = config.UserConfig?.AllowRegister !== false; // 默认允许注册
      
      if (!allowRegister) {
        return NextResponse.json(
          { error: '管理员已关闭用户注册功能' },
          { status: 403 }
        );
      }
    } catch (err) {
      console.error('检查注册配置失败', err);
      return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
    }

    // 验证输入
    if (!username || typeof username !== 'string' || username.trim() === '') {
      console.log('[注册] 验证失败: 用户名为空');
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      console.log('[注册] 验证失败: 密码为空');
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      console.log('[注册] 验证失败: 两次密码不一致');
      return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
    }

    if (password.length < 6) {
      console.log(`[注册] 验证失败: 密码长度不足 (${password.length} < 6)`);
      return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
    }

    // 检查是否与管理员用户名冲突
    if (username === process.env.USERNAME) {
      console.log(`[注册] 验证失败: 用户名与管理员冲突 (${username})`);
      return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
    }

    // 检查用户名格式（只允许字母数字和下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      console.log(`[注册] 验证失败: 用户名格式不符合要求 (${username})`);
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线，长度3-20位' },
        { status: 400 }
      );
    }

    console.log(`[注册] ✅ 所有验证通过，准备注册用户: ${username}`);

    try {
      // 检查用户是否已存在
      console.log(`[注册] 检查用户是否已存在: ${username}`);
      const userExists = await db.checkUserExist(username);
      if (userExists) {
        console.log(`[注册] 用户已存在，拒绝注册: ${username}`);
        return NextResponse.json({ error: '该用户名已被注册' }, { status: 400 });
      }

      // 注册用户
      console.log(`[注册] 保存用户密码到数据库: ${username}`);
      await db.registerUser(username, password);
      console.log(`[注册] ✅ 用户密码保存成功: ${username}`);

      // 重新获取配置来添加用户
      console.log(`[注册] 获取配置以添加用户到列表`);
      const config = await getConfig();
      console.log(`[注册] 当前配置中的用户数量: ${config.UserConfig.Users.length}`);
      const newUser = {
        username: username,
        role: 'user' as const,
        createdAt: Date.now(), // 设置注册时间戳
      };

      config.UserConfig.Users.push(newUser);

      // 保存更新后的配置
      await db.saveAdminConfig(config);

      // 等待 Upstash 主从同步完成（Read Your Writes 一致性问题）
      // Upstash 使用主从复制，写入主节点后需要时间同步到读副本
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 清除缓存，确保下次获取配置时从数据库读取
      clearConfigCache();

      // 注册成功后自动登录
      const response = NextResponse.json({
        ok: true,
        message: '注册成功，已自动登录'
      });

      const cookieValue = await generateAuthCookie(
        username,
        password,
        'user',
        false  // 数据库模式不在cookie中存储密码，只存储签名
      );
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: false,
      });

      return response;
    } catch (err) {
      console.error('注册用户失败', err);
      return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
    }
  } catch (error) {
    console.error('注册接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}