import * as callbackUrlUtils from './callbackUrlUtils';

describe('callbackUrlUtils', () => {

	it('should identify valid callback urls', () => {
		const url = 'joplin://x-callback-url/openFolder?a=b';
		expect(callbackUrlUtils.isCallbackUrl(url)).toBe(true);
	});

	it('should identify invalid callback urls', () => {
		expect(callbackUrlUtils.isCallbackUrl('not-joplin://x-callback-url/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://xcallbackurl/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/invalidCommand?a=b')).toBe(false);
	});

	it('should identify getCurrentNote and createNote callback urls', () => {
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/getCurrentNote?x-success=hook://a')).toBe(true);
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/createNote?title=Hello&x-success=hook://a')).toBe(true);
	});

	// The trailing "?" pins the command name so a prefix can't bypass validation. See 69826610a.
	it('should reject callback urls whose command name is only a prefix match', () => {
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/getCurrentNoteEvil?x-success=hook://a')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/createNoteEvil?title=x')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('joplin://x-callback-url/openNoteEvil?id=x')).toBe(false);
	});

	it('should parse getCurrentNote and createNote callback urls', () => {
		const getCurrent = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/getCurrentNote?x-success=hook://a');
		expect(getCurrent.command).toBe(callbackUrlUtils.CallbackUrlCommand.GetCurrentNote);
		expect(getCurrent.params).toStrictEqual({ 'x-success': 'hook://a' });

		const create = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/createNote?title=Hello&x-success=hook://a');
		expect(create.command).toBe(callbackUrlUtils.CallbackUrlCommand.CreateNote);
		expect(create.params).toStrictEqual({ title: 'Hello', 'x-success': 'hook://a' });
	});

	it('should build valid note callback urls', () => {
		const noteUrl = callbackUrlUtils.getNoteCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(noteUrl)).toBe(true);
		expect(noteUrl).toBe('joplin://x-callback-url/openNote?id=123456');
	});

	it('should build valid folder callback urls', () => {
		const folderUrl = callbackUrlUtils.getFolderCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(folderUrl)).toBe(true);
		expect(folderUrl).toBe('joplin://x-callback-url/openFolder?id=123456');
	});

	it('should build valid tag callback urls', () => {
		const tagUrl = callbackUrlUtils.getTagCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(tagUrl)).toBe(true);
		expect(tagUrl).toBe('joplin://x-callback-url/openTag?id=123456');
	});

	it('should parse note callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openNote?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenNote);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should parse folder callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openFolder?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenFolder);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should parse tag callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('joplin://x-callback-url/openTag?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenTag);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should throw an error on invalid input', () => {
		expect(() => callbackUrlUtils.parseCallbackUrl('not-a-url'))
			.toThrowError('Invalid callback url not-a-url');

		expect(() => callbackUrlUtils.parseCallbackUrl('not-joplin://x-callback-url/123?a=b'))
			.toThrowError('Invalid callback url not-joplin://x-callback-url/123?a=b');

		expect(() => callbackUrlUtils.parseCallbackUrl('joplin://xcallbackurl/123?a=b'))
			.toThrowError('Invalid callback url joplin://xcallbackurl/123?a=b');
	});



});
