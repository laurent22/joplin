module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
	],

	testEnvironment: 'node',

	slowTestThreshold: 30,

	// setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
};
