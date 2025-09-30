import { NextRequest, NextResponse } from 'next/server';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { CalendarCacheManager } from '@/lib/calendar-cache';

export const runtime = 'nodejs';

// 前端直接读取数据库缓存的API
export async function GET(request: NextRequest) {
  // 检查用户认证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 前端请求数据库缓存...');

    // 直接从数据库缓存读取
    const cachedData = await CalendarCacheManager.getCalendarData();

    if (cachedData) {
      console.log('✅ 返回数据库缓存给前端');
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedData
      });
    } else {
      console.log('📭 数据库缓存无效');
      return NextResponse.json({
        success: true,
        cached: false,
        data: null
      });
    }
  } catch (error) {
    console.error('前端读取数据库缓存失败:', error);
    return NextResponse.json({
      success: false,
      cached: false,
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}