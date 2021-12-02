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

	setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
};
