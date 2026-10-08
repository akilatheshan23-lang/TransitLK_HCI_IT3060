/**
 * Test Auth Fixture Registry & Production Token Hardening
 *
 * Rules:
 * - Test fixtures are accepted ONLY inside isolated automated tests.
 * - In production runtime (process.env.NODE_ENV === 'production'), all test fixtures are strictly rejected.
 * - In normal development and production servers, test fixtures are empty by default.
 * - No hardcoded privileged tokens in production middleware.
 */

const globalTestFixtures = new Map();

/**
 * Register a test fixture token in isolated test suites
 */
export function registerTestAuthFixture(token, user) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test auth fixtures cannot be registered in production runtime');
  }
  globalTestFixtures.set(token, user);
}

/**
 * Clear all registered test auth fixtures
 */
export function clearTestAuthFixtures() {
  globalTestFixtures.clear();
}

/**
 * Retrieve a test fixture user if operating in test mode
 */
export function getTestAuthFixture(req, token) {
  // 1. Strict production block: NEVER accept mock/test tokens in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // 2. Check explicit dependency-injected fixtures attached to the Express app
  const appFixtures = req?.app?.get?.('testAuthFixtures');
  if (appFixtures && typeof appFixtures === 'object' && appFixtures[token]) {
    return appFixtures[token];
  }

  // 3. Check explicitly registered global fixtures from the test suite
  if (globalTestFixtures.has(token)) {
    return globalTestFixtures.get(token);
  }

  return null;
}
