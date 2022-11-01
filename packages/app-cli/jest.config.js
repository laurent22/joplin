// When there's an async error in a test (for example due to an async call
// that wasn't waited for in a previous test), do the following:
//
// 1. Get the list of test units up to the point it fails. For example:
//
//     PASS  tests/urlUtils.js
//     PASS  tests/models_BaseItem.js
//     PASS  tests/markdownUtils.js
//     (node:15679) UnhandledPromiseRejectionWarning: Error: {"title":"folder1"}: Fields have not been loaded yet
//     (node:15679) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To termi$ate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 31)
//     FAIL  tests/models_Resource.js
//
// 2. Replace the `testMatch` pattern with these specific files only:
//
//     testMatch: [
//         '**/tests/urlUtils.js',
//         '**/tests/models_BaseItem.js',
//         '**/tests/markdownUtils.js',
//         '**/tests/models_Resource.js',
//     ],
//
// 3. Run the tests and check it still happens.
//
// 4. Remove tests one by one to narrow it down to the one with the async
//    call that's causing problem.

module.exports = {
	testMatch: [
		'**/tests/**/*.js',
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/tests/support/',
		'<rootDir>/build/',
		'<rootDir>/tests/testUtils.js',
		'<rootDir>/tests/tmp/',
		'<rootDir>/tests/test data/',
	],

	// To avoid this warning:
	//
	// jest-haste-map: Haste module naming collision: test_plugin
	// The following files share their name; please adjust your hasteImpl:
	//   * <rootDir>/tests/support/plugins/json_export/package.json
	//   * <rootDir>/tests/support/plugins/package.json
	//
	// https://github.com/facebook/jest/issues/8114#issuecomment-475068766
	modulePathIgnorePatterns: [
		'<rootDir>/tests/support',
		'<rootDir>/build',
	],

	testEnvironment: 'node',
	setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
	slowTestThreshold: 40,
};
