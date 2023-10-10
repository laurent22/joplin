import { defineConfig } from '@playwright/test';

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
	testDir: './integration-tests',

	// Only match .ts files (no compiled .js files)
	testMatch: '*.spec.ts',

	// Run tests in files in sequence.
	// Avoid running Joplin in parallel
	fullyParallel: false,

	// Fail the build on CI if you accidentally left test.only in the source code.
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests
	workers: 1,

	// Reporter to use. See https://playwright.dev/docs/test-reporters
	reporter: 'html',

	// Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
	use: {
		// Base URL to use in actions like `await page.goto('/')`.
		// baseURL: 'http://127.0.0.1:3000',

		// Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
		trace: 'on-first-retry',
	},
});
