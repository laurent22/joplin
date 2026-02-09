import Logger from '@joplin/utils/Logger';

const logger = Logger.create('logDiffDebug');

// Provides additional debugging information for differing strings
const logDiffDebug = (actual: string, expected: string) => {
	const actualBinary = new Uint8Array(new TextEncoder().encode(actual));
	const expectedBinary = new Uint8Array(new TextEncoder().encode(expected));
	for (let i = 0; i < actualBinary.length; i++) {
		if (i >= expectedBinary.length) {
			logger.warn('Actual is longer than expected');
			break;
		}

		if (expectedBinary[i] !== actualBinary[i]) {
			logger.warn(
				'First binary difference at position', i, `(0x${i.toString(16)})`, ': ', expectedBinary[i], '!=', actualBinary[i], '(expected != actual)',
				'\n\tContext: expected[i-3:i+5] = ', [...expectedBinary.slice(i - 3, i + 5)],
				'\n\tContext: actual[i-3 : i+5] = ', [...actualBinary.slice(i - 3, i + 5)],
				'\n\tactual.byteLength = ', actualBinary.length, ', expected.byteLength = ', expectedBinary.length,
			);
			break;
		}
	}

	// Also log information about the last difference
	for (let i = 0; i < Math.min(actualBinary.length, expectedBinary.length); i++) {
		const indexExpected = expectedBinary.length - i - 1;
		const indexActual = actualBinary.length - i - 1;
		if (expectedBinary[indexExpected] !== actualBinary[indexActual]) {
			logger.warn(
				'Last binary difference (working from end)', ': ',
				expectedBinary[indexExpected], '!=', actualBinary[indexActual], `(expected[${indexExpected}] != actual[${indexActual}])`,
				'\n\tContext: expected[a-6:a+3] = ', [...expectedBinary.slice(indexExpected - 6, indexExpected + 3)],
				'\n\tContext: actual[b-6 : b+3] = ', [...actualBinary.slice(indexActual - 6, indexActual + 3)],
				'\n\twhere expected.byteLength = ', expectedBinary.byteLength, 'and actual.byteLength = ', actualBinary.byteLength,
			);
			break;
		}
	}
};

export default logDiffDebug;
