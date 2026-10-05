import crypto from 'node:crypto';

/**
 * Hashes a plaintext password using crypto.scrypt
 * Output format: "salt:hash"
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored "salt:hash"
 */
export function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash || typeof storedPasswordHash !== 'string') {
    return false;
  }

  const [salt, storedHash] = storedPasswordHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  try {
    const computedHashBuffer = crypto.scryptSync(password, salt, 64);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    if (computedHashBuffer.length !== storedHashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedHashBuffer, storedHashBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates an opaque session token and returns both plaintext (for client)
 * and sha256 hash (for database storage)
 */
export function generateSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

/**
 * Hashes a token to compare with database
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 24-character hexadecimal ID compatible with MongoDB
 */
export function generateId() {
  return crypto.randomBytes(12).toString('hex');
}
