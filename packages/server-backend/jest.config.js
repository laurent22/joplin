module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: [
		'<rootDir>/node_modules/',
		'<rootDir>/tests/support/',
		'<rootDir>/tests/testRouters.js',
		'<rootDir>/tests/testUtils.js',
	],

	modulePathIgnorePatterns: [
		'<rootDir>/tests/support',
	],

	testEnvironment: 'node',
};
