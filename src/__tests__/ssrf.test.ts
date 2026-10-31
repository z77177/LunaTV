import { isSafeIp, isSafePublicUrl, safeFetch } from '@/lib/ssrf';

describe('SSRF Protection Tests', () => {
  describe('isSafeIp', () => {
    it('should return true for public IPs', () => {
      expect(isSafeIp('8.8.8.8')).toBe(true);
      expect(isSafeIp('1.1.1.1')).toBe(true);
      expect(isSafeIp('142.250.190.46')).toBe(true);
    });

    it('should return false for loopback and private IPs', () => {
      expect(isSafeIp('127.0.0.1')).toBe(false);
      expect(isSafeIp('0.0.0.0')).toBe(false);
      expect(isSafeIp('10.0.0.1')).toBe(false);
      expect(isSafeIp('10.254.254.254')).toBe(false);
      expect(isSafeIp('192.168.1.1')).toBe(false);
      expect(isSafeIp('172.16.0.1')).toBe(false);
      expect(isSafeIp('172.31.255.255')).toBe(false);
      expect(isSafeIp('169.254.169.254')).toBe(false);
      expect(isSafeIp('::1')).toBe(false);
      expect(isSafeIp('[::1]')).toBe(false);
      expect(isSafeIp('[::ffff:127.0.0.1]')).toBe(false);
      expect(isSafeIp('fe80::1')).toBe(false);
    });

    it('should return false for invalid strings', () => {
      expect(isSafeIp('')).toBe(false);
      expect(isSafeIp('not-an-ip')).toBe(false);
    });
  });

  describe('isSafePublicUrl', () => {
    it('should allow valid public HTTP and HTTPS URLs', async () => {
      const res1 = await isSafePublicUrl('https://example.com/playlist.m3u8');
      expect(res1.safe).toBe(true);

      const res2 = await isSafePublicUrl('http://cdn.doubanio.com/poster.jpg');
      expect(res2.safe).toBe(true);

      const res3 = await isSafePublicUrl('https://8.8.8.8/dns-query');
      expect(res3.safe).toBe(true);
    });

    it('should block local addresses and loopback IPs', async () => {
      const res1 = await isSafePublicUrl('http://127.0.0.1/playlist.m3u8');
      expect(res1.safe).toBe(false);

      const res2 = await isSafePublicUrl('http://127.0.0.1:8080/');
      expect(res2.safe).toBe(false);

      const res3 = await isSafePublicUrl('http://localhost/test.m3u8');
      expect(res3.safe).toBe(false);

      const res4 = await isSafePublicUrl('http://0.0.0.0/test.m3u8');
      expect(res4.safe).toBe(false);

      const res5 = await isSafePublicUrl('http://[::1]:3000/api/server-config');
      expect(res5.safe).toBe(false);

      const res6 = await isSafePublicUrl('http://[::ffff:127.0.0.1]/test');
      expect(res6.safe).toBe(false);

      const res7 = await isSafePublicUrl('http://[::ffff:169.254.169.254]/latest/meta-data');
      expect(res7.safe).toBe(false);

      const res8 = await isSafePublicUrl('http://localhost./api/admin');
      expect(res8.safe).toBe(false);
    });

    it('should block private RFC 1918 addresses', async () => {
      expect((await isSafePublicUrl('http://10.0.0.1/stream.m3u8')).safe).toBe(false);
      expect((await isSafePublicUrl('http://10.254.254.254/live')).safe).toBe(false);
      expect((await isSafePublicUrl('http://192.168.1.1/stream')).safe).toBe(false);
      expect((await isSafePublicUrl('http://192.168.0.100/video')).safe).toBe(false);
      expect((await isSafePublicUrl('http://172.16.0.1/stream')).safe).toBe(false);
      expect((await isSafePublicUrl('http://172.31.255.255/stream')).safe).toBe(false);
    });

    it('should block cloud instance metadata IP', async () => {
      expect((await isSafePublicUrl('http://169.254.169.254/latest/meta-data')).safe).toBe(false);
      expect((await isSafePublicUrl('http://169.254.1.1/internal')).safe).toBe(false);
    });

    it('should block non-HTTP protocols', async () => {
      expect((await isSafePublicUrl('ftp://example.com/video.mp4')).safe).toBe(false);
      expect((await isSafePublicUrl('file:///etc/passwd')).safe).toBe(false);
      expect((await isSafePublicUrl('gopher://example.com:70/')).safe).toBe(false);
      expect((await isSafePublicUrl('javascript:alert(1)')).safe).toBe(false);
      expect((await isSafePublicUrl('data:text/html,<h1>test</h1>')).safe).toBe(false);
    });

    it('should reject invalid or malformed URLs', async () => {
      expect((await isSafePublicUrl('')).safe).toBe(false);
      expect((await isSafePublicUrl('not-a-valid-url')).safe).toBe(false);
      expect((await isSafePublicUrl('http://')).safe).toBe(false);
    });
  });

  describe('safeFetch', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should reject unsafe initial URL immediately without fetching', async () => {
      await expect(safeFetch('http://127.0.0.1:8080/secret')).rejects.toThrow(
        /SSRF Blocked/
      );
      await expect(safeFetch('http://localhost:3000')).rejects.toThrow(
        /SSRF Blocked/
      );
    });

    it('should intercept 302 redirect leading to private or internal IP', async () => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('example.com')) {
          return new Response(null, {
            status: 302,
            headers: { location: 'http://192.168.1.1/admin' },
          });
        }
        return new Response('ok', { status: 200 });
      });

      await expect(safeFetch('https://example.com/redirect')).rejects.toThrow(
        /SSRF Blocked.*192\.168\.1\.1/
      );
    });

    it('should follow safe redirect chain and return successful response', async () => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url === 'https://example.com/step1') {
          return new Response(null, {
            status: 301,
            headers: { location: 'https://example.com/final' },
          });
        }
        if (url === 'https://example.com/final') {
          return new Response('final content', { status: 200 });
        }
        return new Response('not found', { status: 404 });
      });

      const res = await safeFetch('https://example.com/step1');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('final content');
    });

    it('should throw when maximum redirects limit is exceeded', async () => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        return new Response(null, {
          status: 302,
          headers: { location: url },
        });
      });

      await expect(safeFetch('https://example.com/loop', {}, 3)).rejects.toThrow(
        /Too many redirects/
      );
    });
  });
});
