module.exports = {
	preset: 'react-native',

	'moduleFileExtensions': [
		'ts',
		'tsx',
		'js',
	],

	testMatch: ['**/*.test.(ts|tsx|js)'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	slowTestThreshold: 40,
};
