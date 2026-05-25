
import baseConfig from '../../jest.config.base.js';
module.exports = {
	...baseConfig,

	testMatch: ['**/*.test.js'],
	testPathIgnorePatterns: ['<rootDir>/node_modules/'],
};
