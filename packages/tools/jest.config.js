module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
	],

	testEnvironment: 'node',

	// setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
	// slowTestThreshold: 40,
};
