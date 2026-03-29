
// Provides additional debugging information for differing strings
const getDiffDebugMessage = (actual: string, expected: string) => {
	if (actual === expected) return '';

	const diffMessage = [];

	// List all characters present in actual that were not present in expected.
	// This helps debug issues in which the unicode replacement character has been
	// added incorrectly:
	{
		const inExpected = new Set();
		for (let i = 0; i < expected.length; i++) {
			inExpected.add(expected.charAt(i));
		}

		const unexpected = new Set();
		for (let i = 0; i < actual.length; i++) {
			const char = actual.charAt(i);
			if (!inExpected.has(char)) {
				unexpected.add(actual.charAt(i));
			}
		}

		if (unexpected.size) {
			diffMessage.push('Characters found in actual that were not in the expected state:\n');
			diffMessage.push('  ', JSON.stringify([...unexpected]), '\n\n');
		}
	}

	const actualBinary = new Uint8Array(new TextEncoder().encode(actual));
	const expectedBinary = new Uint8Array(new TextEncoder().encode(expected));

	if (actualBinary.length > expectedBinary.length) {
		diffMessage.push(`Actual is longer than expected by ${actualBinary.length - expectedBinary.length}\n`);
	} else if (expectedBinary.length > actualBinary.length) {
		diffMessage.push(`Expected is longer than actual by ${expectedBinary.length - actualBinary.length}\n`);
	}

	for (let i = 0; i < actualBinary.length; i++) {
		if (i >= expectedBinary.length) {
			break;
		}

		if (expectedBinary[i] !== actualBinary[i]) {
			diffMessage.push(
				'First binary difference at position', i, `(0x${i.toString(16)})`, ': ', expectedBinary[i], '!=', actualBinary[i], '(expected != actual)',
				'\n\tContext: expected[i-3:i+5] = ', [...expectedBinary.slice(i - 3, i + 5)],
				'\n\tContext: actual[i-3 : i+5] = ', [...actualBinary.slice(i - 3, i + 5)],
				'\n\tactual.byteLength = ', actualBinary.length, ', expected.byteLength = ', expectedBinary.length,
				'\n\n',
			);
			break;
		}
	}

	// Also log information about the last difference
	for (let i = 0; i < Math.min(actualBinary.length, expectedBinary.length); i++) {
		const indexExpected = expectedBinary.length - i - 1;
		const indexActual = actualBinary.length - i - 1;
		if (expectedBinary[indexExpected] !== actualBinary[indexActual]) {
			diffMessage.push(
				'Last binary difference (working from end)', ': ',
				expectedBinary[indexExpected], '!=', actualBinary[indexActual], `(expected[${indexExpected}] != actual[${indexActual}])`,
				'\n\tContext: expected[a-6:a+3] = ', [...expectedBinary.slice(indexExpected - 6, indexExpected + 3)],
				'\n\tContext: actual[b-6 : b+3] = ', [...actualBinary.slice(indexActual - 6, indexActual + 3)],
				'\n\twhere expected.byteLength = ', expectedBinary.byteLength, 'and actual.byteLength = ', actualBinary.byteLength,
				'\n\n',
			);
			break;
		}
	}

	return diffMessage.join(' ');
};

export default getDiffDebugMessage;
