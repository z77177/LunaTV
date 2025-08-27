/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { getMatchedDanDanPlayComments } from '@/lib/dandanplay.client';
import { Danmaku } from '@/lib/types';

export const runtime = 'nodejs';

// 生成视频ID（用于标识同一个视频的不同版本）
function generateVideoId(source: string, title: string, episode: number): string {
  return `${source}_${title.replace(/\s+/g, '')}_ep${episode}`;
}

// GET - 获取混合弹幕列表（自建弹幕 + DanDanPlay弹幕）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const title = searchParams.get('title');
    const episode = searchParams.get('episode');

    if (!source || !title || !episode) {
      return NextResponse.json(
        { error: '缺少必要参数: source, title, episode' },
        { status: 400 }
      );
    }

    const episodeNum = parseInt(episode);
    const videoId = generateVideoId(source, title, episodeNum);

    // 并行获取自建弹幕和DanDanPlay弹幕
    const [localDanmaku, ddpDanmaku] = await Promise.allSettled([
      db.getDanmakuList(videoId),
      getMatchedDanDanPlayComments(title, episodeNum)
    ]);

    const allDanmaku: Danmaku[] = [];

    // 添加自建弹幕
    if (localDanmaku.status === 'fulfilled') {
      allDanmaku.push(...localDanmaku.value);
    } else {
      console.error('获取本地弹幕失败:', localDanmaku.reason);
    }

    // 添加DanDanPlay弹幕
    if (ddpDanmaku.status === 'fulfilled') {
      allDanmaku.push(...ddpDanmaku.value);
    } else {
      console.error('获取DanDanPlay弹幕失败:', ddpDanmaku.reason);
    }

    // 按时间排序
    allDanmaku.sort((a, b) => a.time - b.time);

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: allDanmaku,
      meta: {
        local: localDanmaku.status === 'fulfilled' ? localDanmaku.value.length : 0,
        dandanplay: ddpDanmaku.status === 'fulfilled' ? ddpDanmaku.value.length : 0,
        total: allDanmaku.length,
      },
    });
  } catch (error) {
    console.error('获取混合弹幕列表失败:', error);
    return NextResponse.json(
      { error: '获取弹幕列表失败' },
      { status: 500 }
    );
  }
}