module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/assets/',
	],

	testEnvironment: 'node',

	slowTestThreshold: 60,

	setupFilesAfterEnv: [
		'jest-expect-message',
		`${__dirname}/jest.setup.js`,
	],

	bail: true,
};
