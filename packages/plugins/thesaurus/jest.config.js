const baseConfig = require('../../../jest.config.base.js');

module.exports = {
	...baseConfig,
	testEnvironment: 'node',
	testMatch: ['**/tests/**/*.test.ts'],
	transform: {
		'\\.(ts)$': 'ts-jest',
	},
	testPathIgnorePatterns: ['<rootDir>/node_modules/'],
};
