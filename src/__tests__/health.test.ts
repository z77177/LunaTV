import { NextRequest } from 'next/server';

import { GET } from '../app/api/health/route';
import { _resetMemoryRateLimitCache } from '../lib/rate-limit';

describe('System Health API (/api/health)', () => {
  beforeEach(() => {
    _resetMemoryRateLimitCache();
    jest.clearAllMocks();
  });

  it('returns healthy status with system and storage metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(typeof body.uptime).toBe('number');
    expect(body.storage).toBeDefined();
    expect(body.storage.status).toBe('ok');
    expect(body.memory).toBeDefined();
    expect(typeof body.memory.heapUsedMB).toBe('number');
    expect(typeof body.responseTimeMs).toBe('number');
  });

  it('rate limits excessive health checks', async () => {
    const ip = '10.0.0.1';
    let lastResponse;
    for (let i = 0; i < 61; i++) {
      const req = new NextRequest('http://localhost:3000/api/health', {
        headers: { 'x-real-ip': ip },
      });
      lastResponse = await GET(req);
    }

    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse?.json();
    expect(body.error).toContain('健康巡检请求过于频繁');
  });
});
