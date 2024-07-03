import resolvePathWithinDir from './resolvePathWithinDir';

describe('resolvePathWithinDir', () => {
	test('should return correct values for Unix-style paths', () => {
		const testCases = [
			// Absolute paths
			{ baseDir: '/a/test/path/', path: '/a/test/path/test.txt', expected: '/a/test/path/test.txt' },
			{ baseDir: '/a/test/path/', path: '/a/test/path/..test.txt', expected: '/a/test/path/..test.txt' },
			{ baseDir: '/a/test/path/', path: '/a/test/path/.test.txt', expected: '/a/test/path/.test.txt' },
			{ baseDir: '/a/test/path', path: '/a/test/path/.test.txt', expected: '/a/test/path/.test.txt' },
			{ baseDir: '/a/test/path', path: '/a/test/path', expected: '/a/test/path' },
			{ baseDir: '/a/test/path', path: '/a/', expected: null },
			{ baseDir: '/a/test/path', path: '/a/test/', expected: null },
			{ baseDir: '/a/test/path', path: '/a/test/pa', expected: null },
			{ baseDir: '/a/test/path', path: '/a/test/path2', expected: null },
			{ baseDir: '/a/test/path', path: '/a/test/path\\//subdir', expected: null },

			// Relative paths
			{ baseDir: '/a/test/path', path: './test', expected: '/a/test/path/test' },
			{ baseDir: '/a/test/path', path: '../path/test/2', expected: '/a/test/path/test/2' },
			{ baseDir: '/a/test/path', path: '../path/test/../../../2', expected: null },
			{ baseDir: '/a/test/path', path: '../test', expected: null },
		];

		for (const testCase of testCases) {
			expect(resolvePathWithinDir(testCase.baseDir, testCase.path, false)).toBe(testCase.expected);
		}
	});

	test('should return correct values for Windows-style paths', () => {
		expect(resolvePathWithinDir('C:\\a\\test\\path', 'C:\\a\\test\\path\\2', true)).toBe('C:\\a\\test\\path\\2');
		expect(resolvePathWithinDir('C:\\\\a\\test\\path', '.\\path\\2', true)).toBe('C:\\a\\test\\path\\path\\2');
		expect(resolvePathWithinDir('C:\\a\\test\\path', '..\\path\\2', true)).toBe('C:\\a\\test\\path\\2');
		expect(resolvePathWithinDir('C:\\a\\test\\path', '..\\2', true)).toBe(null);
		expect(resolvePathWithinDir('D:\\a\\test\\path', 'C:\\a\\test\\path\\2', true)).toBe(null);
		expect(resolvePathWithinDir('\\a\\test\\path', 'D:\\a\\test\\path\\2', true)).toBe(null);
	});
});
