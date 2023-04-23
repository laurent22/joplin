import gotoAnythingStyleQuery from './gotoAnythingStyleQuery';

describe('searchengine/gotoAnythingStyleQuery', () => {

	it('should prepare queries', () => {
		const testCases: [string, string][] = [
			['hello', 'hello*'],
			['hello welc', 'hello* welc*'],
		];

		for (const [input, expected] of testCases) {
			const actual = gotoAnythingStyleQuery(input);
			expect(actual).toBe(expected);
		}
	});

});
