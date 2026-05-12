type LocalCacheEntry = {
  data: any;
  expire?: number;
  created?: number;
};

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readLocalCache(key: string): any | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as LocalCacheEntry;
    if (entry.expire && Date.now() > entry.expire) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data ?? null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeLocalCache(key: string, data: any, expireSeconds?: number): void {
  if (!canUseLocalStorage()) return;

  try {
    const entry: LocalCacheEntry = {
      data,
      created: Date.now(),
      expire: expireSeconds ? Date.now() + expireSeconds * 1000 : undefined,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache writes are best-effort; localStorage may be full or unavailable.
  }
}

function deleteLocalCache(key: string): void {
  if (!canUseLocalStorage()) return;
  localStorage.removeItem(key);
}

function clearExpiredLocalCache(prefix?: string): void {
  if (!canUseLocalStorage()) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || (prefix && !key.startsWith(prefix))) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry = JSON.parse(raw) as LocalCacheEntry;
      if (entry.expire && Date.now() > entry.expire) {
        keysToRemove.push(key);
      }
    } catch {
      if (!prefix || key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export class ClientCache {
  static async get(key: string): Promise<any | null> {
    return readLocalCache(key);
  }

  static async set(key: string, data: any, expireSeconds?: number): Promise<void> {
    writeLocalCache(key, data, expireSeconds);
  }

  static async delete(key: string): Promise<void> {
    deleteLocalCache(key);
  }

  static async clearExpired(prefix?: string): Promise<void> {
    clearExpiredLocalCache(prefix);
  }
}
