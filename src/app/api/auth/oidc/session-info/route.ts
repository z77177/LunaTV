import { NextRequest, NextResponse } from 'next/server';

import { verifySignature } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const oidcSessionCookie = request.cookies.get('oidc_session')?.value;

    if (!oidcSessionCookie) {
      return NextResponse.json(
        { error: 'OIDC会话不存在' },
        { status: 404 }
      );
    }

    let oidcSession;
    try {
      oidcSession = JSON.parse(oidcSessionCookie);
    } catch {
      return NextResponse.json(
        { error: 'OIDC会话无效' },
        { status: 400 }
      );
    }

    // 检查session是否过期(10分钟)
    if (Date.now() - oidcSession.timestamp > 600000) {
      return NextResponse.json(
        { error: 'OIDC会话已过期' },
        { status: 400 }
      );
    }

    // 验证会话防篡改签名
    if (!oidcSession.sig || !process.env.PASSWORD) {
      return NextResponse.json(
        { error: 'OIDC会话签名缺失或无效' },
        { status: 400 }
      );
    }
    const isSigValid = await verifySignature(
      `${oidcSession.sub}:${oidcSession.timestamp}`,
      oidcSession.sig,
      process.env.PASSWORD
    );
    if (!isSigValid) {
      return NextResponse.json(
        { error: 'OIDC会话签名校验失败' },
        { status: 403 }
      );
    }

    // 返回用户信息(不包含sub)
    return NextResponse.json({
      email: oidcSession.email,
      name: oidcSession.name,
      trust_level: oidcSession.trust_level,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
