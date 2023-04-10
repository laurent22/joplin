module.exports = {
	'moduleFileExtensions': [
		'ts',
		'tsx',
		'js',
	],

	testEnvironment: 'node',

	'transform': {
		'\\.(ts|tsx)$': 'ts-jest',
	},

	testMatch: ['**/*.test.(ts|tsx)'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	slowTestThreshold: 40,
};
