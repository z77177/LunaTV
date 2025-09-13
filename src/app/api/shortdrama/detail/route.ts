/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { parseShortDramaEpisode } from '@/lib/shortdrama.client';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const episode = searchParams.get('episode');

    if (!id) {
      return NextResponse.json(
        { error: '缺少必要参数: id' },
        { status: 400 }
      );
    }

    const videoId = parseInt(id);
    const episodeNum = episode ? parseInt(episode) : 1;

    if (isNaN(videoId) || isNaN(episodeNum)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    // 解析视频，默认使用代理
    const result = await parseShortDramaEpisode(videoId, episodeNum, true);

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.msg || '解析失败' },
        { status: 400 }
      );
    }

    // 转换为兼容格式
    // 对于短剧，episodes数组存储的是集数占位符，真实URL需要通过额外API获取
    const response = {
      id: result.data!.videoId.toString(),
      title: result.data!.videoName,
      poster: result.data!.cover,
      episodes: Array.from({ length: result.data!.totalEpisodes }, (_, i) =>
        `shortdrama:${result.data!.videoId}:${i}` // API实际使用0-based索引
      ),
      episodes_titles: Array.from({ length: result.data!.totalEpisodes }, (_, i) =>
        `第${i + 1}集`
      ),
      source: 'shortdrama',
      source_name: '短剧',
      year: new Date().getFullYear().toString(),
      desc: result.data!.description,
      type_name: '短剧',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('短剧详情获取失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}