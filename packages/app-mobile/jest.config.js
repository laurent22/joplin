// Test configuration
// See https://jestjs.io/docs/configuration#testenvironment-string

const config = {
	preset: 'ts-jest',
	moduleFileExtensions: [
		'ts',
		'tsx',
		'js',
	],

	// See https://jestjs.io/docs/webpack#handling-static-assets
	moduleNameMapper: {
		'\\.(css|lessc)': '<rootDir>/__mocks__/styleMock.js',
	},
};

module.exports = config;
