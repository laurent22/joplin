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

	slowTestThreshold: 40,
};
