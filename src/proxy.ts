/* eslint-disable no-console */

import ipaddr from 'ipaddr.js';
import { NextRequest, NextResponse } from 'next/server';

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  generateSignature,
  getAuthInfoFromCookie,
  verifyAuthSignature,
} from '@/lib/auth';

// 游客模式配置缓存（从 API 获取）
let guestModeCache: boolean | null = null;
let guestModeCacheTime = 0;

// 信任网络配置缓存（从 API 获取）
let trustedNetworkCache: { enabled: boolean; trustedIPs: string[] } | null = null;
let trustedNetworkCacheTime = 0;
let trustedNetworkFetched = false;
let trustedNetworkVersion = ''; // 跟踪配置版本，用于立即失效缓存

const CACHE_TTL = 86400000; // 24 小时缓存（配置变化时通过 cookie 版本号立即刷新）

// 从环境变量获取信任网络配置（优先）
function getTrustedNetworkFromEnv(): { enabled: boolean; trustedIPs: string[] } | null {
  const trustedIPs = process.env.TRUSTED_NETWORK_IPS;
  if (!trustedIPs) return null;

  return {
    enabled: true,
    trustedIPs: trustedIPs.split(',').map(ip => ip.trim()).filter(Boolean),
  };
}

// 从 API 获取信任网络配置（数据库）
async function getTrustedNetworkFromAPI(request: NextRequest): Promise<{ enabled: boolean; trustedIPs: string[] } | null> {
  const now = Date.now();

  // 检查缓存是否有效
  if (trustedNetworkFetched && trustedNetworkCache !== null) {
    if ((now - trustedNetworkCacheTime) < CACHE_TTL) {
      if (!trustedNetworkCache.enabled) {
        return null;
      }
      return trustedNetworkCache;
    }
  }

  // 如果已经获取过且结果是"未配置"，使用长缓存时间
  if (trustedNetworkFetched && trustedNetworkCache === null) {
    if ((now - trustedNetworkCacheTime) < CACHE_TTL) {
      return null;
    }
  }

  try {
    const url = new URL('/api/server-config', request.url);
    url.searchParams.set('key', 'TrustedNetworkConfig');

    const response = await fetch(url.toString(), {
      headers: {
        'x-internal-request': 'true',
        'x-internal-secret': process.env.PASSWORD || '',
      },
    });

    trustedNetworkFetched = true;
    trustedNetworkCacheTime = now;

    if (response.ok) {
      const data = await response.json();
      if (data.TrustedNetworkConfig) {
        trustedNetworkCache = {
          enabled: data.TrustedNetworkConfig.enabled ?? false,
          trustedIPs: data.TrustedNetworkConfig.trustedIPs || [],
        };

        if (!trustedNetworkCache.enabled) {
          return null;
        }

        return trustedNetworkCache;
      }
    }

    // API 返回但没有配置 - 标记为禁用而不是 null，这样走禁用缓存逻辑
    trustedNetworkCache = { enabled: false, trustedIPs: [] };
  } catch {
    // 请求失败时标记为禁用，使用长缓存时间避免频繁重试
    trustedNetworkCache = { enabled: false, trustedIPs: [] };
  }

  return null;
}

// 获取信任网络配置（环境变量优先，然后数据库）
async function getTrustedNetworkConfig(request: NextRequest): Promise<{ enabled: boolean; trustedIPs: string[] } | null> {
  // 环境变量优先
  const envConfig = getTrustedNetworkFromEnv();
  if (envConfig) return envConfig;

  // 检查 cookie 中的配置版本号
  // 管理页面保存配置时会更新这个 cookie，版本号变化时强制刷新缓存
  const cookieVersion = request.cookies.get('tn-version')?.value || '';
  if (cookieVersion && cookieVersion !== trustedNetworkVersion) {
    // 版本号变了，强制清除缓存，立即重新获取
    trustedNetworkCache = null;
    trustedNetworkFetched = false;
    trustedNetworkVersion = cookieVersion;
  }

  // 尝试从数据库获取（内部已处理禁用状态的缓存优化）
  return await getTrustedNetworkFromAPI(request);
}

// 获取游客模式配置（从 API 获取并缓存）
async function getGuestModeConfig(request: NextRequest): Promise<boolean> {
  const now = Date.now();
  if (guestModeCache !== null && (now - guestModeCacheTime) < CACHE_TTL) {
    return guestModeCache;
  }

  try {
    const url = new URL('/api/server-config', request.url);
    url.searchParams.set('key', 'UserConfig');

    const response = await fetch(url.toString(), {
      headers: {
        'x-internal-request': 'true',
        'x-internal-secret': process.env.PASSWORD || '',
      },
    });

    guestModeCacheTime = now;
    if (response.ok) {
      const data = await response.json();
      guestModeCache = data.AllowGuestMode !== false;
      return guestModeCache;
    }
  } catch {
    // 失败时保持现有缓存或默认允许
  }

  if (guestModeCache !== null) return guestModeCache;
  return true;
}

// 获取客户端 IP
function getClientIP(request: NextRequest): string {
  // 按优先级获取客户端 IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// 高可靠 IP/CIDR 匹配（支持 IPv4/IPv6 标准与压缩格式）
function isIPInCIDR(clientIP: string, cidr: string): boolean {
  if (cidr === '*') return true;
  if (!clientIP || clientIP === 'unknown') return false;

  try {
    const clientAddr = ipaddr.process(clientIP.trim());

    if (cidr.includes('/')) {
      const parsedCIDR = ipaddr.parseCIDR(cidr.trim());
      return clientAddr.match(parsedCIDR);
    }

    const targetAddr = ipaddr.process(cidr.trim());
    return clientAddr.toNormalizedString() === targetAddr.toNormalizedString();
  } catch {
    return false;
  }
}

// 检查 IP 是否在信任网络中
function isIPTrusted(clientIP: string, trustedIPs: string[]): boolean {
  return trustedIPs.some(trustedIP => isIPInCIDR(clientIP, trustedIP.trim()));
}

// 生成信任网络的自动登录 cookie（附带完整 HMAC 签名，防止绕过中间件的路由被伪造）
async function generateTrustedAuthCookie(baseResponse?: NextResponse): Promise<NextResponse> {
  const response = baseResponse || NextResponse.next();

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const username = process.env.USERNAME || 'admin';

  if (storageType === 'localstorage') {
    // localstorage 模式：设置密码 cookie
    const authInfo = {
      password: process.env.PASSWORD,
      loginTime: Date.now(),
    };
    response.cookies.set('user_auth', JSON.stringify(authInfo), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS, // 长期保持
    });
  } else {
    const timestamp = Date.now();
    const role = 'owner' as const;
    const signature = process.env.PASSWORD
      ? await generateSignature(`${username}:${role}:${timestamp}`, process.env.PASSWORD)
      : '';
    // 在信任网络模式下，我们设置一个带 HMAC 签名的信任标记
    const authInfo = {
      username,
      trustedNetwork: true,
      timestamp,
      loginTime: timestamp,
      role,
      signature,
    };
    response.cookies.set('user_auth', JSON.stringify(authInfo), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS, // 长期保持
    });
  }

  return response;
}

// 生成访客自动登录 cookie
function generateGuestAuthCookie(baseResponse?: NextResponse): NextResponse {
  const response = baseResponse || NextResponse.next();
  const guestAuth = {
    username: '访客',
    role: 'user',
    isGuest: true,
    loginTime: Date.now(),
  };
  response.cookies.set('user_auth', JSON.stringify(guestAuth), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3 * 24 * 60 * 60, // 3 天
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 处理 /adult/ 路径前缀，重写为实际路径
  if (pathname.startsWith('/adult/')) {
    // 移除 /adult 前缀并规范化多余前导斜杠（防止 /adult//api/admin 绕过）
    const stripped = pathname.replace(/^\/adult/, '');
    const newPathname = stripped.replace(/^\/+/, '/') || '/';

    // 创建新的 URL
    const url = request.nextUrl.clone();
    url.pathname = newPathname;

    // 添加 adult=1 参数（如果还没有）
    if (!url.searchParams.has('adult')) {
      url.searchParams.set('adult', '1');
    }

    // 重写请求
    const response = NextResponse.rewrite(url);

    // 设置响应头标识成人内容模式
    response.headers.set('X-Content-Mode', 'adult');

    // 🛡️ 对所有非公开白名单路径统一执行认证与 RBAC 检查（包含 /adult/admin 及 /adult/api/*）
    if (shouldSkipAuth(newPathname)) {
      return response;
    }

    const modifiedRequest = new NextRequest(url, request);
    return handleAuthentication(modifiedRequest, newPathname, response);
  }

  // 跳过不需要认证的路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  return handleAuthentication(request, pathname);
}

// 提取认证处理逻辑为单独的函数
async function handleAuthentication(
  request: NextRequest,
  pathname: string,
  response?: NextResponse
) {
  // 🔥 检查信任网络模式（环境变量优先，然后数据库）
  const trustedNetworkConfig = await getTrustedNetworkConfig(request);
  let isCurrentRequestFromTrustedNetwork = false;
  if (trustedNetworkConfig?.enabled && trustedNetworkConfig.trustedIPs.length > 0) {
    const clientIP = getClientIP(request);

    if (isIPTrusted(clientIP, trustedNetworkConfig.trustedIPs)) {
      isCurrentRequestFromTrustedNetwork = true;
      console.log(`[Middleware] Trusted network auto-login for IP: ${clientIP}`);

      // 检查是否已经有有效的认证 cookie
      const existingAuth = getAuthInfoFromCookie(request);
      if (existingAuth) {
        if (existingAuth.password && existingAuth.password === process.env.PASSWORD) {
          return response || NextResponse.next();
        }
        if (existingAuth.signature && process.env.PASSWORD) {
          const isValid = await verifyAuthSignature(existingAuth, process.env.PASSWORD);
          if (isValid) {
            return response || NextResponse.next();
          }
        }
      }

      // 没有有效认证 cookie，自动生成并设置
      return await generateTrustedAuthCookie(response);
    }
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (!process.env.PASSWORD) {
    // 如果没有设置密码，重定向到警告页面
    const warningUrl = new URL('/warning', request.url);
    return NextResponse.redirect(warningUrl);
  }

  // 获取游客模式开关状态
  const allowGuest = await getGuestModeConfig(request);

  // 从cookie获取认证信息
  const authInfo = getAuthInfoFromCookie(request);

  if (!authInfo) {
    // 🔥 如果允许游客模式，自动生成一个访客会话（排除管理后台路径）
    if (allowGuest && !pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
      console.log(`[Middleware] Auto-generating guest session for path: ${pathname}`);
      return generateGuestAuthCookie(response);
    }
    return handleAuthFailure(request, pathname);
  }

  // 🚀 访客模式 (如果已禁用游客模式或企图篡改角色，则拒绝访问并要求登录)
  if (authInfo.isGuest === true && authInfo.username === '访客') {
    if (
      !allowGuest ||
      (authInfo.role && authInfo.role !== 'user') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/admin')
    ) {
      return handleAuthFailure(request, pathname);
    }
    return response || NextResponse.next();
  }

  // localstorage模式：在middleware中完成验证
  if (storageType === 'localstorage') {
    if (!authInfo.password || authInfo.password !== process.env.PASSWORD) {
      return handleAuthFailure(request, pathname);
    }
    return response || NextResponse.next();
  }

  // 其他模式：验证签名或信任网络标记
  // 🔥 信任网络模式：严格比对当前请求物理来源是否属于授信 IP
  if (authInfo.trustedNetwork) {
    if (isCurrentRequestFromTrustedNetwork) {
      return response || NextResponse.next();
    }
    // 伪造或失效的 trustedNetwork 标记：当前物理 IP 并不在授信白名单中，拒绝放行
    console.warn(`[Middleware] 拦截未授权的 trustedNetwork 请求`);
    return handleAuthFailure(request, pathname);
  }

  // 检查是否有用户名（非localStorage模式下密码不存储在cookie中）
  if (!authInfo.username || !authInfo.signature) {
    return handleAuthFailure(request, pathname);
  }

  // 检查会话时效（防重放与超期）
  if (authInfo.timestamp && (Date.now() - authInfo.timestamp) / 1000 > AUTH_COOKIE_MAX_AGE_SECONDS) {
    console.warn(`[Middleware] 会话已过期: ${authInfo.username}`);
    return handleAuthFailure(request, pathname);
  }

  // 验证防篡改签名
  if (authInfo.signature) {
    const isValidSignature = await verifyAuthSignature(
      authInfo,
      process.env.PASSWORD || ''
    );

    // 签名验证通过
    if (isValidSignature) {
      // 🛡️ 网关层 RBAC 权限控制：访问管理后台或管理 API 必须具备 admin 或 owner 角色
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        if (authInfo.role !== 'admin' && authInfo.role !== 'owner') {
          console.warn(`[Middleware] 拦截非管理员访问管理路径: ${authInfo.username} (${authInfo.role}) -> ${pathname}`);
          if (pathname.startsWith('/api')) {
            return new NextResponse('Forbidden: Admin role required', { status: 403 });
          }
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      return response || NextResponse.next();
    }
  }

  // 签名验证失败或不存在签名
  return handleAuthFailure(request, pathname);
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/icons/',
    '/logo.png',
    '/screenshot.png',
    '/login',
    '/register',
    '/oidc-register',
    '/warning',
    '/api/login',
    '/api/register',
    '/api/logout',
    '/api/telegram/webhook',
    '/api/telegram/send-magic-link',
    '/api/telegram/verify',
    '/api/auth/oidc/',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置 proxy 匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|oidc-register|warning|api/login|api/register|api/logout|api/cron$|api/cron\\?|api/server-config|api/tvbox/|api/tvbox$|api/tvbox\\?|api/live/merged|api/parse|api/bing-wallpaper|api/proxy/|api/telegram/webhook|api/telegram/send-magic-link|api/telegram/verify|api/auth/oidc/).*)',
  ],
};
