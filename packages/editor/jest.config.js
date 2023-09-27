module.exports = {
	'moduleFileExtensions': [
		'ts',
		'tsx',
		'js',
		'jsx',
	],

	'transform': {
		'\\.(ts|tsx)$': 'ts-jest',
	},

	testEnvironment: 'jsdom',
	testMatch: ['**/*.test.(ts|tsx)'],
	setupFilesAfterEnv: ['./jest.setup.js'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],
	slowTestThreshold: 40,
};
