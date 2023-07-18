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
	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	// Do transform most packages in node_modules (transformations correct unrecognized
	// import syntax)
	transformIgnorePatterns: ['<rootDir>/node_modules/jest'],

	slowTestThreshold: 40,
};
