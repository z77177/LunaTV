import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie, verifyAuthSignature } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * 获取观影室配置
 * GET /api/watch-room/config
 */
export async function GET() {
  try {
    const config = await getConfig();
    const watchRoomConfig = config.WatchRoomConfig;

    // 如果未配置或未启用，返回 disabled
    if (!watchRoomConfig || !watchRoomConfig.enabled) {
      return NextResponse.json({
        enabled: false,
      });
    }

    // 返回配置（不包含 authKey，authKey 由客户端单独经过鉴权请求）
    return NextResponse.json({
      enabled: true,
      serverUrl: watchRoomConfig.serverUrl,
    });
  } catch (error) {
    console.error('获取观影室配置失败:', error);
    return NextResponse.json(
      { error: '获取配置失败', enabled: false },
      { status: 500 }
    );
  }
}

/**
 * 获取观影室完整配置（包含 authKey，需通过会话或访客校验）
 * POST /api/watch-room/config
 */
export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
    const config = await getConfig();

    if (storageType === 'localstorage') {
      const allowGuest = config.UserConfig?.AllowGuestMode !== false;
      const isGuestValid = allowGuest && authInfo.isGuest === true && authInfo.username === '访客';
      if (!isGuestValid && (!authInfo.password || authInfo.password !== process.env.PASSWORD)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (authInfo.isGuest === true && authInfo.username === '访客') {
      const allowGuest = config.UserConfig?.AllowGuestMode !== false;
      if (!allowGuest) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const isValid = await verifyAuthSignature(authInfo, process.env.PASSWORD || '');
      if (!isValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const watchRoomConfig = config.WatchRoomConfig;

    if (!watchRoomConfig) {
      return NextResponse.json({
        enabled: false,
        serverUrl: '',
        authKey: '',
      });
    }

    return NextResponse.json({
      enabled: watchRoomConfig.enabled || false,
      serverUrl: watchRoomConfig.serverUrl || '',
      authKey: watchRoomConfig.authKey || '',
    });
  } catch (error) {
    console.error('获取观影室完整配置失败:', error);
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    );
  }
}
