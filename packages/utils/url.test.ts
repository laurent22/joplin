import { fileUriToPath, hasProtocol } from './url';

describe('utils/url', () => {

	it('should convert a file URI to a file path', (async () => {
		// Tests imported from https://github.com/TooTallNate/file-uri-to-path/tree/master/test
		const testCases = {
			'file://host/path': '//host/path',
			'file://localhost/etc/fstab': '/etc/fstab',
			'file:///etc/fstab': '/etc/fstab',
			'file:///c:/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
			'file://localhost/c|/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
			'file:///c|/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
			'file://localhost/c:/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
			'file://hostname/path/to/the%20file.txt': '//hostname/path/to/the file.txt',
			'file:///c:/path/to/the%20file.txt': 'c:/path/to/the file.txt',
			'file:///C:/Documents%20and%20Settings/davris/FileSchemeURIs.doc': 'C:/Documents and Settings/davris/FileSchemeURIs.doc',
			'file:///C:/caf%C3%A9/%C3%A5r/d%C3%BCnn/%E7%89%9B%E9%93%83/Ph%E1%BB%9F/%F0%9F%98%B5.exe': 'C:/café/år/dünn/牛铃/Phở/😵.exe',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			const actual = fileUriToPath(input);
			expect(actual).toBe(expected);
		}

		expect(fileUriToPath('file://c:/not/quite/right')).toBe('c:/not/quite/right');
		expect(fileUriToPath('file:///d:/better')).toBe('d:/better');
		expect(fileUriToPath('file:///c:/AUTOEXEC.BAT', 'win32')).toBe('c:\\AUTOEXEC.BAT');
	}));

	test.each([
		[
			'https://joplinapp.org',
			'https',
			true,
		],
		[
			'https://joplinapp.org',
			'http',
			false,
		],
		[
			'https://joplinapp.org',
			['http', 'https'],
			true,
		],
		[
			'https://joplinapp.org',
			[],
			false,
		],
		[
			'',
			[],
			false,
		],
		[
			'joplin://openNote?id=ABCD',
			['http', 'https', 'joplin'],
			true,
		],
	])('should tell if a URL has a particular protocol', (url, protocol, expected) => {
		const actual = hasProtocol(url, protocol);
		expect(actual).toBe(expected);
	});

});
