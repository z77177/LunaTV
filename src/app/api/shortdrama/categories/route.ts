import { NextResponse } from 'next/server';

import { getShortDramaCategories } from '@/lib/shortdrama.client';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getShortDramaCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('获取短剧分类失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}