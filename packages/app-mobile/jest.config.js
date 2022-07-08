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
};

module.exports = config;
