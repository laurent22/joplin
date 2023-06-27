module.exports = {
	preset: 'react-native',

	'moduleFileExtensions': [
		'ts',
		'tsx',
		'js',
		'jsx',
	],

	'transform': {
		'\\.(ts|tsx)$': 'ts-jest',
	},

	setupFilesAfterEnv: ['./jest.setup.js'],
	testMatch: ['**/*.test.(ts|tsx)'],

	transformIgnorePatterns: ['<rootDir>/node_modules/jest'],
	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	slowTestThreshold: 40,
};
