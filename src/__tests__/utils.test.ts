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
});
