import {
  generateAuthCookie,
  generateSignature,
  verifyAuthSignature,
  verifySignature,
} from '@/lib/auth';

describe('Auth Security & Signature Tests', () => {
  const secretKey = 'test-secret-password-123456';

  describe('HMAC-SHA256 Signatures', () => {
    it('should generate valid signature and verify successfully', async () => {
      const data = 'testuser:owner:1700000000000';
      const sig = await generateSignature(data, secretKey);
      expect(typeof sig).toBe('string');
      expect(sig.length).toBe(64); // SHA-256 hex string

      const isValid = await verifySignature(data, sig, secretKey);
      expect(isValid).toBe(true);
    });

    it('should reject tampered data', async () => {
      const data = 'testuser:owner:1700000000000';
      const sig = await generateSignature(data, secretKey);

      const isTamperedValid = await verifySignature(
        'testuser:admin:1700000000000',
        sig,
        secretKey
      );
      expect(isTamperedValid).toBe(false);
    });

    it('should reject incorrect secret', async () => {
      const data = 'testuser';
      const sig = await generateSignature(data, secretKey);

      const isValid = await verifySignature(data, sig, 'wrong-secret');
      expect(isValid).toBe(false);
    });
  });

  describe('verifyAuthSignature Anti-Tampering & Compatibility', () => {
    it('should verify new signed session with username, role, timestamp', async () => {
      const username = 'alice';
      const role = 'admin' as const;
      const timestamp = Date.now();
      const payload = `${username}:${role}:${timestamp}`;
      const signature = await generateSignature(payload, secretKey);

      const isValid = await verifyAuthSignature(
        { username, role, timestamp, signature },
        secretKey
      );
      expect(isValid).toBe(true);
    });

    it('should reject privilege escalation when role is modified in cookie', async () => {
      const username = 'bob';
      const originalRole = 'user' as const;
      const timestamp = Date.now();
      const payload = `${username}:${originalRole}:${timestamp}`;
      const signature = await generateSignature(payload, secretKey);

      // Malicious client tampers cookie role to 'owner'
      const isTamperedValid = await verifyAuthSignature(
        { username, role: 'owner', timestamp, signature },
        secretKey
      );
      expect(isTamperedValid).toBe(false);
    });

    it('should backward-compatibly verify legacy signatures that only signed username (restricted to user role)', async () => {
      const username = 'legacyUser';
      const legacySignature = await generateSignature(username, secretKey);

      // Legacy cookie without timestamp or with role 'user'
      const isValid = await verifyAuthSignature(
        { username, signature: legacySignature },
        secretKey
      );
      expect(isValid).toBe(true);

      // Must reject role escalation when using legacy signature
      const isOwnerEscalationValid = await verifyAuthSignature(
        { username, role: 'owner', signature: legacySignature },
        secretKey
      );
      expect(isOwnerEscalationValid).toBe(false);

      const isAdminEscalationValid = await verifyAuthSignature(
        { username, role: 'admin', signature: legacySignature },
        secretKey
      );
      expect(isAdminEscalationValid).toBe(false);
    });

    it('should reject invalid or missing fields', async () => {
      expect(await verifyAuthSignature({}, secretKey)).toBe(false);
      expect(
        await verifyAuthSignature({ username: 'alice' }, secretKey)
      ).toBe(false);
      expect(
        await verifyAuthSignature(
          { username: 'alice', signature: 'invalid' },
          ''
        )
      ).toBe(false);
    });
  });

  describe('generateAuthCookie', () => {
    it('should encode user auth data with signature', async () => {
      process.env.PASSWORD = secretKey;
      const cookieStr = await generateAuthCookie('charlie', 'user');
      expect(cookieStr).toBeDefined();

      const decoded = JSON.parse(decodeURIComponent(cookieStr));
      expect(decoded.username).toBe('charlie');
      expect(decoded.role).toBe('user');
      expect(decoded.timestamp).toBeDefined();
      expect(decoded.signature).toBeDefined();

      const isValid = await verifyAuthSignature(decoded, secretKey);
      expect(isValid).toBe(true);
    });
  });

  describe('OIDC Session Anti-Tampering', () => {
    it('should generate and verify OIDC registration session token', async () => {
      const oidcSub = 'github_12345678';
      const timestamp = Date.now();
      const payload = `${oidcSub}:${timestamp}`;

      const sig = await generateSignature(payload, secretKey);
      expect(typeof sig).toBe('string');

      const isValid = await verifySignature(payload, sig, secretKey);
      expect(isValid).toBe(true);

      // Malicious attacker attempts to change oidcSub
      const isTamperedValid = await verifySignature(
        `attacker_id:${timestamp}`,
        sig,
        secretKey
      );
      expect(isTamperedValid).toBe(false);
    });
  });
});
