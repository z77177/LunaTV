import { NextRequest } from 'next/server';

// 认证 Cookie 有效期（180天，长期保持登录状态）
export const AUTH_COOKIE_MAX_AGE_DAYS = 180;
export const AUTH_COOKIE_MAX_AGE_SECONDS = AUTH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
  isGuest?: boolean;
} | null {
  // 尝试新的 cookie 名称 user_auth，如果没有则尝试旧的 auth
  const authCookie = request.cookies.get('user_auth') || request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    // 处理可能的双重编码
    let decoded = decodeURIComponent(authCookie.value);

    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);
    return authData;
  } catch {
    return null;
  }
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
  isGuest?: boolean;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    }, {} as Record<string, string>);

    // 尝试新的 cookie 名称 user_auth，如果没有则尝试旧的 auth
    const authCookie = cookies['user_auth'] || cookies['auth'];
    if (!authCookie) {
      return null;
    }

    // 处理可能的双重编码
    let decoded = decodeURIComponent(authCookie);

    // 如果解码后仍然包含 %，说明是双重编码，需要再次解码
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);
    return authData;
  } catch {
    return null;
  }
}

// 生成 HMAC-SHA256 签名 (Web Crypto API 跨 Edge/Node 兼容)
export async function generateSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 验证 HMAC-SHA256 签名
export async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!data || !signature || !secret) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      messageData
    );
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

// 综合验证会话签名与时效，兼容新旧版本签名
export async function verifyAuthSignature(
  authInfo: {
    username?: string;
    role?: 'owner' | 'admin' | 'user';
    timestamp?: number;
    signature?: string;
  },
  secret: string
): Promise<boolean> {
  if (!authInfo.username || !authInfo.signature || !secret) return false;

  const role = authInfo.role || 'user';

  // 1. 优先校验新版签名：username:role:timestamp
  if (authInfo.timestamp) {
    const payload = `${authInfo.username}:${role}:${authInfo.timestamp}`;
    const isValid = await verifySignature(payload, authInfo.signature, secret);
    if (isValid) return true;
  }

  // 2. 向下兼容老版本签名（仅签署 username）：
  // 🛡️ 严禁用于 admin / owner 高权限角色，防止普通用户利用旧版签名篡改 role 提权
  if (role !== 'user') {
    return false;
  }

  return await verifySignature(authInfo.username, authInfo.signature, secret);
}

// 生成统一的认证 Cookie 内容（兼容多参数签名）
export async function generateAuthCookie(
  username?: string,
  arg2?: any,
  arg3?: any,
  arg4 = false
): Promise<string> {
  let role: 'owner' | 'admin' | 'user' = 'user';
  let password = '';
  let includePassword = false;

  if (typeof arg2 === 'object' && arg2 !== null) {
    role = arg2.role || 'user';
    password = arg2.password || '';
    includePassword = Boolean(arg2.includePassword);
  } else if (typeof arg2 === 'string' && (arg2 === 'owner' || arg2 === 'admin' || arg2 === 'user')) {
    role = arg2;
    if (typeof arg3 === 'object' && arg3 !== null) {
      password = arg3.password || '';
      includePassword = Boolean(arg3.includePassword);
    }
  } else {
    // 兼容历史调用形式: generateAuthCookie(username, password, role, includePassword)
    password = typeof arg2 === 'string' ? arg2 : '';
    role = (arg3 === 'owner' || arg3 === 'admin' || arg3 === 'user') ? arg3 : 'user';
    includePassword = Boolean(arg4);
  }

  const authData: Record<string, any> = { role };

  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    const timestamp = Date.now();
    authData.username = username;
    authData.timestamp = timestamp;
    authData.loginTime = timestamp;
    // 🛡️ 防篡改：将 username:role:timestamp 共同纳入签名，防止客户端修改 role 或重放
    const signPayload = `${username}:${role}:${timestamp}`;
    const signature = await generateSignature(signPayload, process.env.PASSWORD);
    authData.signature = signature;
  }

  return encodeURIComponent(JSON.stringify(authData));
}
