import gotoAnythingStyleQuery from './gotoAnythingStyleQuery';

describe('search/gotoAnythingStyleQuery', () => {

	it('should prepare queries', () => {
		const testCases: [string, string][] = [
			['hello', 'hello*'],
			['hello welc', 'hello* welc*'],
			['joplin://x-callback-url/openNote?id=3600e074af0e4b06aeb0ae76d3d96af7', 'joplin://x-callback-url/openNote?id=3600e074af0e4b06aeb0ae76d3d96af7'],
			['3600e074af0e4b06aeb0ae76d3d96af7', '3600e074af0e4b06aeb0ae76d3d96af7'],
			['', ''],
		];

		for (const [input, expected] of testCases) {
			const actual = gotoAnythingStyleQuery(input);
			expect(actual).toBe(expected);
		}
	});

});
