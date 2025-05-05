module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/rnInjectedJs/',
		'<rootDir>/vendor/',
	],

	testEnvironment: 'node',

	setupFilesAfterEnv: [
		'jest-expect-message',
		`${__dirname}/jest.setup.js`,
	],
	slowTestThreshold: 40,
};
