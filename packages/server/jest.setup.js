// We don't want the tests to fail due to timeout, especially on CI, and certain
// tests can take more time since we do integration testing too.
jest.setTimeout(30 * 1000);

process.env.JOPLIN_IS_TESTING = '1';
