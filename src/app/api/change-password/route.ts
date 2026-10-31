/* eslint-disable no-console*/

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie, verifyAuthSignature } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  // 不支持 localstorage 模式
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储模式修改密码',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // 获取认证信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username || !authInfo.signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 强校验会话签名，防止伪造身份越权修改密码
    const isValidSignature = await verifyAuthSignature(
      authInfo,
      process.env.PASSWORD || ''
    );
    if (!isValidSignature) {
      return NextResponse.json({ error: '会话签名无效或已过期' }, { status: 401 });
    }

    // 验证原密码
    if (!oldPassword || typeof oldPassword !== 'string') {
      return NextResponse.json({ error: '原密码不得为空' }, { status: 400 });
    }

    // 验证新密码
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: '新密码不得为空' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度至少为 6 位' }, { status: 400 });
    }

    const username = authInfo.username;

    // 不允许站长修改密码（站长用户名等于 process.env.USERNAME）
    if (username === process.env.USERNAME) {
      return NextResponse.json(
        { error: '站长不能通过此接口修改密码' },
        { status: 403 }
      );
    }

    // 校验原密码是否正确
    const isOldPasswordValid = await db.verifyUser(username, oldPassword);
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 400 });
    }

    // 修改密码
    await db.changePassword(username, newPassword);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      {
        error: '修改密码失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
