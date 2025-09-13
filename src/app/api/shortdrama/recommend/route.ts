import { NextRequest, NextResponse } from 'next/server';

import { getRecommendedShortDramas } from '@/lib/shortdrama.client';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const size = searchParams.get('size');

    const categoryNum = category ? parseInt(category) : undefined;
    const pageSize = size ? parseInt(size) : 10;

    if ((category && isNaN(categoryNum!)) || isNaN(pageSize)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    const result = await getRecommendedShortDramas(categoryNum, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取推荐短剧失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}