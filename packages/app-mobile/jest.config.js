module.exports = {
	preset: 'react-native',

	'moduleFileExtensions': [
		'ts',
		'tsx',
		'js',
	],

	'transform': {
		'\\.(ts|tsx)$': 'ts-jest',
	},

	testMatch: ['**/*.test.(ts|tsx)'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	'transformIgnorePatterns': [
		'node_modules/(?!@codemirror)/',
	],

	slowTestThreshold: 40,
};
