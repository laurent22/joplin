// TEMPORARY - to verify that CI repeats changed test files. Delete before merging.

describe('flakyDemo', () => {

	test('should randomly fail', () => {
		const value = Math.random();
		// Passes ~70% of the time, so it should fail within 5 attempts.
		expect(value).toBeLessThan(0.7);
	});

});
