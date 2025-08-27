/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { Danmaku } from '@/lib/types';

export const runtime = 'nodejs';

// 生成视频ID（用于标识同一个视频的不同版本）
function generateVideoId(source: string, title: string, episode: number): string {
  // 使用来源、标题和集数生成唯一ID
  return `${source}_${title.replace(/\s+/g, '')}_ep${episode}`;
}

// 生成弹幕ID
function generateDanmakuId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// GET - 获取弹幕列表
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

    const videoId = generateVideoId(source, title, parseInt(episode));
    const danmakuList = await db.getDanmakuList(videoId);

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: danmakuList,
    });
  } catch (error) {
    console.error('获取弹幕列表失败:', error);
    return NextResponse.json(
      { error: '获取弹幕列表失败' },
      { status: 500 }
    );
  }
}

// POST - 发送弹幕
export async function POST(request: NextRequest) {
  try {
    // 检查用户认证
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { source, title, episode, time, text, color = '#FFFFFF', type = 0 } = body;

    // 验证参数
    if (!source || !title || episode === undefined || time === undefined || !text) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证弹幕内容
    if (text.length > 100) {
      return NextResponse.json(
        { error: '弹幕内容不能超过100个字符' },
        { status: 400 }
      );
    }

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: '弹幕内容不能为空' },
        { status: 400 }
      );
    }

    // 验证时间
    if (time < 0) {
      return NextResponse.json(
        { error: '时间不能为负数' },
        { status: 400 }
      );
    }

    // 验证类型
    if (![0, 1, 2].includes(type)) {
      return NextResponse.json(
        { error: '弹幕类型无效' },
        { status: 400 }
      );
    }

    const videoId = generateVideoId(source, title, parseInt(episode));
    const danmaku: Danmaku = {
      id: generateDanmakuId(),
      videoId,
      userId: authInfo.username,
      time: parseFloat(time),
      text: text.trim(),
      color,
      type,
      createTime: Date.now(),
    };

    await db.addDanmaku(danmaku);

    return NextResponse.json({
      code: 200,
      message: '发送成功',
      data: danmaku,
    });
  } catch (error) {
    console.error('发送弹幕失败:', error);
    return NextResponse.json(
      { error: '发送弹幕失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除弹幕
export async function DELETE(request: NextRequest) {
  try {
    // 检查用户认证
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const danmakuId = searchParams.get('id');

    if (!danmakuId) {
      return NextResponse.json(
        { error: '缺少弹幕ID' },
        { status: 400 }
      );
    }

    // TODO: 这里需要检查是否是弹幕作者或管理员
    // 现在暂时允许用户删除自己的弹幕

    await db.deleteDanmaku(danmakuId);

    return NextResponse.json({
      code: 200,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除弹幕失败:', error);
    return NextResponse.json(
      { error: '删除弹幕失败' },
      { status: 500 }
    );
  }
}