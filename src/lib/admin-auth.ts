import { NextRequest } from 'next/server';

import { AdminConfig } from '@/lib/admin.types';
import { AUTH_COOKIE_MAX_AGE_SECONDS, getAuthInfoFromCookie, verifyAuthSignature } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export type AdminRole = 'owner' | 'admin';

async function resolveRoleFromConfig(
  config: AdminConfig,
  username: string
): Promise<AdminRole | null> {
  if (process.env.USERNAME && username === process.env.USERNAME) {
    return 'owner';
  }

  const user = config.UserConfig.Users.find((u) => u.username === username);
  if (user && !user.banned && user.role === 'admin') {
    return 'admin';
  }

  return null;
}

export async function getAdminRoleFromRequest(
  request: NextRequest
): Promise<AdminRole | null> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo) {
    return null;
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (storageType === 'localstorage') {
    const password = authInfo.password;
    if (password && password === process.env.PASSWORD) {
      return 'owner';
    }
    return null;
  }

  const username = authInfo.username;
  if (!username) {
    return null;
  }

  // 检查时效
  if (
    authInfo.timestamp &&
    (Date.now() - authInfo.timestamp) / 1000 > AUTH_COOKIE_MAX_AGE_SECONDS
  ) {
    return null;
  }

  // 🛡️ 强制验证 Cookie HMAC 签名（含信任网络 Cookie，防止客户端伪造 trustedNetwork: true 提权）
  if (!authInfo.signature || !process.env.PASSWORD) {
    return null;
  }
  const isValid = await verifyAuthSignature(authInfo, process.env.PASSWORD);
  if (!isValid) {
    return null;
  }

  if (process.env.USERNAME && username === process.env.USERNAME) {
    return 'owner';
  }

  const config = await getConfig();
  return resolveRoleFromConfig(config, username);
}

export async function ensureAdmin(request: NextRequest): Promise<AdminRole> {
  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    throw new Error('UNAUTHORIZED');
  }
  return role;
}
