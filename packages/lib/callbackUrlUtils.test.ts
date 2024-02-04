import * as callbackUrlUtils from './callbackUrlUtils';

describe('callbackUrlUtils', () => {

	it('should identify valid callback urls', () => {
		const url = 'joplin://x-callback-url/openFolder?a=b';
		expect(callbackUrlUtils.isCallbackUrl(url)).toBe(true);
		const url2 = 'joplin://folder/HIdtrMwpS9CHsODBEbMBZg';
		expect(callbackUrlUtils.isCallbackUrl(url2)).toBe(true);
		const url3 = 'joplin://note/6-Hne-XCQyqf_cJtsGUcqw';
		expect(callbackUrlUtils.isCallbackUrl(url3)).toBe(true);
	});

	it('should identify invalid callback urls', () => {
		expect(callbackUrlUtils.isCallbackUrl('not-joplin://x-callback-url/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://xcallbackurl/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/invalidCommand?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://alias/helloworld')).toBe(false);
	});

	it('should build valid note callback urls', () => {
		const noteUrl = callbackUrlUtils.getNoteCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(noteUrl)).toBe(true);
		expect(noteUrl).toBe('joplin://note/EjRW');

		const noteUrl2 = callbackUrlUtils.getNoteCallbackUrl('ebe1e77be5c2432a9ffdc26db0651cab');
		expect(callbackUrlUtils.isCallbackUrl(noteUrl2)).toBe(true);
		expect(noteUrl2).toBe('joplin://note/6-Hne-XCQyqf_cJtsGUcqw');
	});

	it('should build valid folder callback urls', () => {
		const folderUrl = callbackUrlUtils.getFolderCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(folderUrl)).toBe(true);
		expect(folderUrl).toBe('joplin://folder/EjRW');

		const folderUrl2 = callbackUrlUtils.getFolderCallbackUrl('b5b380bbc5c341c08ac4dd3bca065cf5');
		expect(callbackUrlUtils.isCallbackUrl(folderUrl2)).toBe(true);
		expect(folderUrl2).toBe('joplin://folder/tbOAu8XDQcCKxN07ygZc9Q');
	});

	it('should build valid tag callback urls', () => {
		const tagUrl = callbackUrlUtils.getTagCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(tagUrl)).toBe(true);
		expect(tagUrl).toBe('joplin://tag/EjRW');

		const tagUrl2 = callbackUrlUtils.getTagCallbackUrl('1c876daccc294bd087b0e0c111b30166');
		expect(callbackUrlUtils.isCallbackUrl(tagUrl2)).toBe(true);
		expect(tagUrl2).toBe('joplin://tag/HIdtrMwpS9CHsODBEbMBZg');
	});

	it('should parse note callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openNote?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenNote);
		expect(parsed.params).toStrictEqual({ id: '123456' });

		const parsed2 = callbackUrlUtils.parseCallbackUrl('joplin://note/6-Hne-XCQyqf_cJtsGUcqw');
		expect(parsed2.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenNote);
		expect(parsed2.params).toStrictEqual({ id: 'ebe1e77be5c2432a9ffdc26db0651cab' });

	});

	it('should parse folder callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openFolder?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenFolder);
		expect(parsed.params).toStrictEqual({ id: '123456' });

		const parsed2 = callbackUrlUtils.parseCallbackUrl('joplin://folder/tbOAu8XDQcCKxN07ygZc9Q');
		expect(parsed2.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenFolder);
		expect(parsed2.params).toStrictEqual({ id: 'b5b380bbc5c341c08ac4dd3bca065cf5' });

	});

	it('should parse tag callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openTag?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenTag);
		expect(parsed.params).toStrictEqual({ id: '123456' });

		const parsed2 = callbackUrlUtils.parseCallbackUrl('joplin://tag/HIdtrMwpS9CHsODBEbMBZg');
		expect(parsed2.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenTag);
		expect(parsed2.params).toStrictEqual({ id: '1c876daccc294bd087b0e0c111b30166' });
	});

	it('should throw an error on invalid input', () => {
		expect(() => callbackUrlUtils.parseCallbackUrl('not-a-url'))
			.toThrowError('Invalid callback url not-a-url');

		expect(() => callbackUrlUtils.parseCallbackUrl('not-joplin://x-callback-url/123?a=b'))
			.toThrowError('Invalid callback url not-joplin://x-callback-url/123?a=b');

		expect(() => callbackUrlUtils.parseCallbackUrl('joplin://xcallbackurl/123?a=b'))
			.toThrowError('Invalid callback url joplin://xcallbackurl/123?a=b');

		expect(() => callbackUrlUtils.parseCallbackUrl('joplin://alias/helloworld'))
			.toThrowError('Invalid callback url joplin://alias/helloworld');

		expect(() => callbackUrlUtils.parseCallbackUrl('joplin://note/1234+5[asd]6789'))
			.toThrowError('Invalid callback url joplin://note/1234+5[asd]6789');
	});



});
