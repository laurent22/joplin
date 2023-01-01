const { extractExecutablePath, quotePath, unquotePath, friendlySafeFilename, toFileProtocolPath } = require('./path-utils');

describe('pathUtils', function() {



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

	it('should quote and unquote paths', (async () => {
		const testCases = [
			['', ''],
			['/my/path', '/my/path'],
			['/my/path with spaces', '"/my/path with spaces"'],
			['/my/weird"path', '"/my/weird\\"path"'],
			['c:\\Windows\\test.dll', 'c:\\Windows\\test.dll'],
			['c:\\Windows\\test test.dll', '"c:\\Windows\\test test.dll"'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(quotePath(t[0])).toBe(t[1]);
			expect(unquotePath(quotePath(t[0]))).toBe(t[0]);
		}
	}));

	it('should extract executable path from command', (async () => {
		const testCases = [
			['', ''],
			['/my/cmd -some -args', '/my/cmd'],
			['"/my/cmd" -some -args', '"/my/cmd"'],
			['"/my/cmd"', '"/my/cmd"'],
			['"/my/cmd and space" -some -flags', '"/my/cmd and space"'],
			['"" -some -flags', '""'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			expect(extractExecutablePath(t[0])).toBe(t[1]);
		}
	}));

	it('should create correct fileURL syntax', (async () => {
		const testCases_win32 = [
			['C:\\handle\\space test', 'file:///C:/handle/space%20test'],
			['C:\\escapeplus\\+', 'file:///C:/escapeplus/%2B'],
			['C:\\handle\\single quote\'', 'file:///C:/handle/single%20quote%27'],
		];
		const testCases_unixlike = [
			['/handle/space test', 'file:///handle/space%20test'],
			['/escapeplus/+', 'file:///escapeplus/%2B'],
			['/handle/single quote\'', 'file:///handle/single%20quote%27'],
		];

		for (let i = 0; i < testCases_win32.length; i++) {
			const t = testCases_win32[i];
			expect(toFileProtocolPath(t[0], 'win32')).toBe(t[1]);
		}
		for (let i = 0; i < testCases_unixlike.length; i++) {
			const t = testCases_unixlike[i];
			expect(toFileProtocolPath(t[0], 'linux')).toBe(t[1]);
		}
	}));

});
