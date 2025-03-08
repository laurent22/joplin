import { RenderedNoteMetadata, parseRenderedNoteMetadata } from './utils';

describe('interop/utils', () => {

	test.each<[string, RenderedNoteMetadata]>([
		[
			'',
			{ printTitle: true },
		],
		[
			'<!-- joplin-metadata-print-title = false -->',
			{ printTitle: false },
		],
		[
			'<!-- joplin-metadata-print-title = true -->',
			{ printTitle: true },
		],
		[
			'<!-- joplin-metadata-print-title = 0 -->',
			{ printTitle: false },
		],
		[
			'<!-- joplin-metadata-print-title = 1 -->',
			{ printTitle: true },
		],
		[
			'<!--  joplin-metadata-print-title    =   0  -->',
			{ printTitle: false },
		],
	])('should parse metadata from the note HTML body', async (bodyHtml, expected) => {
		const actual = parseRenderedNoteMetadata(bodyHtml);
		expect(actual).toEqual(expected);
	});

});
