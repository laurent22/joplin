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

	testEnvironment: 'jsdom',
	testMatch: ['**/*.test.(ts|tsx)'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],
	setupFilesAfterEnv: ['./jest.setup.js'],

	// Do transform most packages in node_modules (transformations correct unrecognized
	// import syntax)
	transformIgnorePatterns: ['<rootDir>/node_modules/jest'],

	slowTestThreshold: 40,
};
