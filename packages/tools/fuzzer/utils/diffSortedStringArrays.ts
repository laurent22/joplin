
// Input arrays must be sorted
const diffSortedStringArrays = (actual: string[], expected: string[]) => {
	const missing = [];
	const unexpected = [];

	let indexActual = 0;
	let indexExpected = 0;
	for (;
		indexActual < actual.length && indexExpected < expected.length;
		indexActual++, indexExpected++
	) {

		const itemActual = actual[indexActual];
		const itemExpected = expected[indexExpected];

		if (itemActual !== itemExpected) {
			let found = false;
			// Case 1: The expected item is present eventually, after a few unexpected item:
			for (let i = indexActual + 1; i < actual.length; i++) {
				if (actual[i] === itemExpected) {
					// Everything before the found item shouldn't have been present:
					unexpected.push(actual.slice(indexActual, i));

					indexActual = i;
					found = true;
					break;
				}
			}

			// Case 2: The expected item wasn't present at all:
			if (!found) {
				missing.push(itemExpected);

				// Revisit the current item in "actual" on the next loop:
				indexActual --;
			}
		}
	}

	// Handle any unexpected items at the end
	if (indexActual < actual.length) {
		unexpected.push(actual.slice(indexActual));
	}
	if (indexExpected < expected.length) {
		missing.push(expected.slice(indexExpected));
	}

	return {
		// Items that were present in the actual state, but are missing from the expected state
		unexpected: unexpected.flat(),
		// Items that were present in the expected state, but missing from the actual state.
		missing: missing.flat(),
	};
};

export default diffSortedStringArrays;

