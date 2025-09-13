
const testPathIgnorePatterns = [
	'<rootDir>/node_modules/',
	'<rootDir>/rnInjectedJs/',
	'<rootDir>/vendor/',
];

if (!process.env.IS_CONTINUOUS_INTEGRATION) {
	// We don't require all developers to have Rust to run the project, so we skip this test if not running in CI
	testPathIgnorePatterns.push('<rootDir>/services/interop/InteropService_Importer_OneNote.*');
}

module.exports = {
	testMatch: [
		'**/*.test.js',
	],

	testPathIgnorePatterns: testPathIgnorePatterns,

	testEnvironment: 'node',

	setupFilesAfterEnv: [
		'jest-expect-message',
		`${__dirname}/jest.setup.js`,
	],
	slowTestThreshold: 40,
};
