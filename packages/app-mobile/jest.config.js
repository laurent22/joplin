module.exports = {
	preset: 'react-native',

	testMatch: ['**/*.test.js'],

	testPathIgnorePatterns: ['<rootDir>/node_modules/'],

	setupFiles: [`${__dirname}/jest.setup.js`],

	slowTestThreshold: 40,
};
