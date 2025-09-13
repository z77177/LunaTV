import { NextRequest, NextResponse } from 'next/server';

import { getShortDramaList } from '@/lib/shortdrama.client';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const page = searchParams.get('page');
    const size = searchParams.get('size');

    if (!categoryId) {
      return NextResponse.json(
        { error: '缺少必要参数: categoryId' },
        { status: 400 }
      );
    }

    const category = parseInt(categoryId);
    const pageNum = page ? parseInt(page) : 1;
    const pageSize = size ? parseInt(size) : 20;

    if (isNaN(category) || isNaN(pageNum) || isNaN(pageSize)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    const result = await getShortDramaList(category, pageNum, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取短剧列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}