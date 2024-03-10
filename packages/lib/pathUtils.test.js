const { friendlySafeFilename } = require('./path-utils');

describe('pathUtils', () => {

	it('should create friendly safe filename', (async () => {
		const testCases = [
			['生活', '生活'],
			['not/good', 'not_good'],
			['really/not/good', 'really_not_good'],
			['con', '___'],
			['no space at the end ', 'no space at the end'],
			['nor dots...', 'nor dots'],
			['  no space before either', 'no space before either'],
			['no\nnewline\n\rplease', 'no_newline__please'],
			['thatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylong', 'thatsreallylongthatsreallylongthatsreallylongthats'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(friendlySafeFilename(t[0])).toBe(t[1]);
		}

		expect(!!friendlySafeFilename('')).toBe(true);
		expect(!!friendlySafeFilename('...')).toBe(true);

		// Check that it optionally handles filenames with extension
		expect(friendlySafeFilename('file', null, true)).toBe('file');
		expect(friendlySafeFilename('  testing.md', null, true)).toBe('testing.md');
		expect(friendlySafeFilename('testing.safe??ext##', null, true)).toBe('testing.safeext');
		expect(friendlySafeFilename('thatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylongthatsreallylong.md', null, true)).toBe('thatsreallylongthatsreallylongthatsreallylongthats.md');
	}));

});
