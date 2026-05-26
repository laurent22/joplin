import shouldFocusLinkUrl from './shouldFocusLinkUrl';

describe('shouldFocusLinkUrl', () => {

	test.each([
		// [description, dialog data, expected]
		[
			'pre-populated text + empty href → focus URL',
			{ text: 'hello world', href: '' },
			true,
		],
		[
			'pre-populated text + missing href → focus URL',
			{ text: 'hello world' } as { text: string; href?: string },
			false, // missing 'href' key entirely means this is not the link dialog
		],
		[
			'pre-populated text + non-empty href (editing existing link) → leave focus',
			{ text: 'hello world', href: 'https://example.com' },
			false,
		],
		[
			'empty text + empty href (no selection, fresh insert) → leave default focus',
			{ text: '', href: '' },
			false,
		],
		[
			'empty text + non-empty href → leave focus',
			{ text: '', href: 'https://example.com' },
			false,
		],
		[
			'undefined data → no focus action',
			undefined,
			false,
		],
		[
			'null data → no focus action',
			null,
			false,
		],
		[
			'empty object (not the link dialog) → no focus action',
			{},
			false,
		],
		[
			'image dialog shape (src/alt, no href/text) → no focus action',
			{ src: 'https://example.com/img.png', alt: 'image' },
			false,
		],
		[
			'text is non-string (defensive) → no focus action',
			{ text: 42, href: '' },
			false,
		],
		[
			'whitespace-only href counts as non-empty → leave focus',
			{ text: 'hello', href: ' ' },
			false,
		],
	])('%s', (_label, data, expected) => {
		expect(shouldFocusLinkUrl(data as Parameters<typeof shouldFocusLinkUrl>[0])).toBe(expected);
	});

});
