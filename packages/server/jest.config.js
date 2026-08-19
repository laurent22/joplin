const baseConfig = require('../../jest.config.base.js');

module.exports = {
	...baseConfig,

	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/assets/',
	],

	testEnvironment: 'node',

	slowTestThreshold: 60,

	setupFilesAfterEnv: [
		'jest-expect-message',
		`${__dirname}/jest.setup.js`,
	],
};
