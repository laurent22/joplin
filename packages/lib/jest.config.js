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
};
