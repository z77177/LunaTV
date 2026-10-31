import { formatTime, parseCustomTimeFormat } from '@/lib/time';
import { getSafeRedirectUrl } from '@/lib/utils';

describe('Utility Functions - Open Redirect Protection', () => {
  describe('getSafeRedirectUrl', () => {
    it('should allow valid relative paths', () => {
      expect(getSafeRedirectUrl('/', '/')).toBe('/');
      expect(getSafeRedirectUrl('/play?id=123&source=vod', '/')).toBe('/play?id=123&source=vod');
      expect(getSafeRedirectUrl('/admin/config', '/')).toBe('/admin/config');
      expect(getSafeRedirectUrl('/live', '/default')).toBe('/live');
    });

    it('should fallback to defaultUrl when input is empty or invalid', () => {
      expect(getSafeRedirectUrl('', '/')).toBe('/');
      expect(getSafeRedirectUrl(null, '/login')).toBe('/login');
      expect(getSafeRedirectUrl(undefined, '/')).toBe('/');
      expect(getSafeRedirectUrl('   ', '/default')).toBe('/default');
    });

    it('should block protocol-relative URLs (open redirect)', () => {
      expect(getSafeRedirectUrl('//attacker.com', '/')).toBe('/');
      expect(getSafeRedirectUrl('//evil.org/phishing', '/home')).toBe('/home');
      expect(getSafeRedirectUrl('///evil.org', '/')).toBe('/');
    });

    it('should block external absolute URLs', () => {
      expect(getSafeRedirectUrl('https://evil.com', '/')).toBe('/');
      expect(getSafeRedirectUrl('http://attacker.com/login', '/fallback')).toBe('/fallback');
      expect(getSafeRedirectUrl('ftp://external.org', '/')).toBe('/');
    });

    it('should block javascript: and data: pseudo-protocols', () => {
      expect(getSafeRedirectUrl('javascript:alert(document.cookie)', '/')).toBe('/');
      expect(getSafeRedirectUrl('JAVASCRIPT:alert(1)', '/')).toBe('/');
      expect(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>', '/')).toBe('/');
      expect(getSafeRedirectUrl('vbscript:msgbox(1)', '/')).toBe('/');
    });

    it('should block backslash bypasses', () => {
      expect(getSafeRedirectUrl('\\attacker.com', '/')).toBe('/');
      expect(getSafeRedirectUrl('/\\attacker.com', '/')).toBe('/');
    });
  });

  describe('parseCustomTimeFormat', () => {
    it('should parse XMLTV compact timestamp with positive timezone offset', () => {
      const d = parseCustomTimeFormat('20250824123000 +0800');
      expect(isNaN(d.getTime())).toBe(false);
      // In UTC, 12:30:00 +0800 is 04:30:00 UTC
      expect(d.toISOString()).toBe('2025-08-24T04:30:00.000Z');
    });

    it('should parse XMLTV compact timestamp with negative timezone offset without failing on minus sign', () => {
      const d = parseCustomTimeFormat('20250824000000 -0400');
      expect(isNaN(d.getTime())).toBe(false);
      // In UTC, 00:00:00 -0400 is 04:00:00 UTC
      expect(d.toISOString()).toBe('2025-08-24T04:00:00.000Z');
    });

    it('should handle standard ISO date strings', () => {
      const d = parseCustomTimeFormat('2025-08-24T08:00:00Z');
      expect(isNaN(d.getTime())).toBe(false);
      expect(d.toISOString()).toBe('2025-08-24T08:00:00.000Z');
    });

    it('should return NaN date for empty or invalid inputs', () => {
      expect(isNaN(parseCustomTimeFormat(null as unknown as string).getTime())).toBe(true);
      expect(isNaN(parseCustomTimeFormat('').getTime())).toBe(true);
      expect(isNaN(parseCustomTimeFormat('invalid-time').getTime())).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('should format seconds into HH:MM:SS or MM:SS correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(599)).toBe('09:59');
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3665)).toBe('01:01:05');
    });

    it('should return 00:00 safely for non-finite or negative seconds', () => {
      expect(formatTime(NaN)).toBe('00:00');
      expect(formatTime(Infinity)).toBe('00:00');
      expect(formatTime(-10)).toBe('00:00');
      expect(formatTime(-0)).toBe('00:00');
    });
  });
});
