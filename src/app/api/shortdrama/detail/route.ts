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
    let episodeNum = episode ? parseInt(episode) : 1;

    if (isNaN(videoId) || isNaN(episodeNum)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    let result: Awaited<ReturnType<typeof parseShortDramaEpisode>> | undefined;
    let totalEpisodes = 0;

    // 尝试不同的集数来获取总集数，类似ShortDramaCard的逻辑
    for (let tryEpisode = episodeNum; tryEpisode <= episodeNum + 5; tryEpisode++) {
      try {
        result = await parseShortDramaEpisode(videoId, tryEpisode, true);

        if (result.code === 0 && result.data && result.data.totalEpisodes > 0) {
          totalEpisodes = result.data.totalEpisodes;
          break;
        }
      } catch (error) {
        console.warn(`尝试获取第${tryEpisode}集失败:`, error);
        continue;
      }
    }

    // 如果所有尝试都失败，使用最后一次的结果或默认值
    if (!result || totalEpisodes === 0) {
      // 最后尝试第0集（有些API使用0-based索引）
      try {
        result = await parseShortDramaEpisode(videoId, 0, true);
        if (result.code === 0 && result.data && result.data.totalEpisodes > 0) {
          totalEpisodes = result.data.totalEpisodes;
        }
      } catch (error) {
        console.warn('尝试获取第0集也失败:', error);
      }
    }

    // 如果仍然获取不到，设置默认值
    if (!result || result.code !== 0 || !result.data) {
      return NextResponse.json(
        { error: '解析失败，无法获取视频信息' },
        { status: 400 }
      );
    }

    // 确保至少有1集
    totalEpisodes = Math.max(totalEpisodes, 1);

    // 转换为兼容格式
    // 对于短剧，episodes数组存储的是集数占位符，真实URL需要通过额外API获取
    const response = {
      id: result.data.videoId.toString(),
      title: result.data.videoName,
      poster: result.data.cover,
      episodes: Array.from({ length: totalEpisodes }, (_, i) =>
        `shortdrama:${result.data.videoId}:${i}` // API实际使用0-based索引
      ),
      episodes_titles: Array.from({ length: totalEpisodes }, (_, i) =>
        `第${i + 1}集`
      ),
      source: 'shortdrama',
      source_name: '短剧',
      year: new Date().getFullYear().toString(),
      desc: result.data.description,
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