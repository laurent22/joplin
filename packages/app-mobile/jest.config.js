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

	setupFiles: [`${__dirname}/jest.setup.js`],

	slowTestThreshold: 40,
};
