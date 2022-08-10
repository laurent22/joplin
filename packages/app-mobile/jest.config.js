// Test configuration
// See https://jestjs.io/docs/configuration#testenvironment-string

const config = {
	preset: 'ts-jest',

	// File extensions for imports, in order of precedence:
	// prefer importing from .ts or .tsx to importing from .js
	// files.
	moduleFileExtensions: [
		'ts',
		'tsx',
		'js',
	],

	// Mocks.
	// See https://jestjs.io/docs/webpack#handling-static-assets
	moduleNameMapper: {
		// Webpack allows importing CSS files. Mock it.
		'\\.(css|lessc)': '<rootDir>/__mocks__/styleMock.js',
		'@melloware/coloris': '<rootDir>/__mocks__/coloris.ts',
	},
};

module.exports = config;
