/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

export async function GET(req: NextRequest) {
  try {
    // localStorage 模式不支持注册
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json({
        enabled: false,
        reason: 'localStorage 模式不支持用户注册'
      });
    }

    try {
      // 检查配置中是否允许注册
      const config = await getConfig();
      const allowRegister = config.UserConfig?.AllowRegister !== false; // 默认允许注册
      
      if (!allowRegister) {
        return NextResponse.json({
          enabled: false,
          reason: '管理员已关闭用户注册功能'
        });
      }

      return NextResponse.json({
        enabled: true,
        reason: ''
      });
    } catch (err) {
      console.error('检查注册状态失败', err);
      return NextResponse.json({
        enabled: true,
        reason: ''
      }); // 出错时默认允许注册，让用户尝试
    }
  } catch (error) {
    console.error('注册状态检测接口异常', error);
    return NextResponse.json({
      enabled: true,
      reason: ''
    }); // 出错时默认允许注册
  }
}