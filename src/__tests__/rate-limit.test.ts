import { _resetMemoryRateLimitCache, checkRateLimit, createRateLimitResponse } from '../lib/rate-limit';

describe('rate-limit utility', () => {
  beforeEach(() => {
    _resetMemoryRateLimitCache();
    jest.clearAllMocks();
  });

  it('allows requests within limit and decrements remaining', async () => {
    const ip = '192.168.1.100';
    const limit = 3;
    const windowMs = 60000;

    const res1 = await checkRateLimit(ip, 'test_action', limit, windowMs);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await checkRateLimit(ip, 'test_action', limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await checkRateLimit(ip, 'test_action', limit, windowMs);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 第 4 次应该被拦截
    const res4 = await checkRateLimit(ip, 'test_action', limit, windowMs);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
  });

  it('distinguishes between different actions and different IPs', async () => {
    const ip1 = '1.1.1.1';
    const ip2 = '2.2.2.2';
    const limit = 1;
    const windowMs = 60000;

    // ip1 在 login 耗尽
    const res1 = await checkRateLimit(ip1, 'login', limit, windowMs);
    expect(res1.allowed).toBe(true);

    const res1Blocked = await checkRateLimit(ip1, 'login', limit, windowMs);
    expect(res1Blocked.allowed).toBe(false);

    // ip1 在 register 应该依然可用
    const res1Register = await checkRateLimit(ip1, 'register', limit, windowMs);
    expect(res1Register.allowed).toBe(true);

    // ip2 在 login 应该依然可用
    const res2 = await checkRateLimit(ip2, 'login', limit, windowMs);
    expect(res2.allowed).toBe(true);
  });

  it('createRateLimitResponse generates 429 status and RFC headers', () => {
    const now = Date.now();
    const resetTime = now + 45000;
    const result = {
      allowed: false,
      remaining: 0,
      resetTime,
      limit: 10,
    };

    const response = createRateLimitResponse(result, '自定义频率限制提示');
    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBeDefined();
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThanOrEqual(40);
  });
});
