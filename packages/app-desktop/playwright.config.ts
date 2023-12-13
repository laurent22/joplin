import { defineConfig } from '@playwright/test';

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
	testDir: './integration-tests',

	// Only match .ts files (no compiled .js files)
	testMatch: '*.spec.ts',

	// Allow running tests in parallel (note: each Joplin instance
	// is given its own profile directory).
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code.
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use. See https://playwright.dev/docs/test-reporters
	reporter: process.env.CI ? 'line' : 'html',

	// The CI machines can sometimes be very slow. Increase per-test timeout in CI.
	timeout: process.env.CI ? 50_000 : 30_000, // milliseconds

	// Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
	use: {
		// Base URL to use in actions like `await page.goto('/')`.
		// baseURL: 'http://127.0.0.1:3000',

		// Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
		trace: 'on-first-retry',
	},
});
