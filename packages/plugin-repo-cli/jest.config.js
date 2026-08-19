const baseConfig = require('../../jest.config.base.js');

module.exports = {
	...baseConfig,

	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
	],

	testEnvironment: 'node',

	slowTestThreshold: 30,

	// setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
};
