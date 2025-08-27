/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

export async function GET() {
  try {
    // localStorage 模式不支持注册
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json({
        available: false,
        reason: 'localStorage 模式不支持用户注册'
      });
    }

    try {
      // 检查配置中是否允许注册
      const config = await getConfig();
      const allowRegister = config.UserConfig?.AllowRegister !== false;
      
      if (!allowRegister) {
        return NextResponse.json({
          available: false,
          reason: '管理员已关闭用户注册功能'
        });
      }

      return NextResponse.json({
        available: true
      });
    } catch (err) {
      console.error('检查注册状态失败', err);
      return NextResponse.json({
        available: true // 出错时默认可用
      });
    }
  } catch (error) {
    console.error('注册状态检测接口异常', error);
    return NextResponse.json({
      available: true
    });
  }
}