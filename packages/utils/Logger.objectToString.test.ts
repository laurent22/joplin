import Logger from './Logger';

class TestRequestError extends Error {
	public constructor(
		message: string,
		public readonly code: any,
		public readonly headers: any,
		public readonly request: any,
	) {
		super(message);
	}
}

describe('Logger', () => {

	test.each([
		[
			new TestRequestError(
				'This is a test error. Invalid password!',
				'401',
				{},
				'{ "Authorization": "bearer thisisafaketoken" }',
			),
			{ contain: 'This is a test error. Invalid password!', exclude: 'thisisafaketoken' },
		],
		[
			new TestRequestError(
				'Test error',
				'401',
				{ authorization: 'exclude-this', password: 'exclude-this' },
				'',
			),
			{ contain: 'Test error', exclude: 'exclude-this' },
		],
		[
			new TestRequestError(
				'Test error',
				'401',
				{ headers: { Auth: 'exclude-this', password: 'exclude-this', test: 'include-this' } },
				'',
			),
			{ contain: 'include-this', exclude: 'exclude-this' },
		],
	])('should strip auth tokens from error objects', async (objectToLog, expectedOutput) => {
		const testLogger = new Logger();
		const asString = testLogger.objectToString(objectToLog);
		expect(asString).toContain(expectedOutput.contain);
		expect(asString).not.toContain(expectedOutput.exclude);
	});
});
