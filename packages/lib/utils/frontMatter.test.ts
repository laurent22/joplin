import { noteToFrontMatter, parse } from './frontMatter';
import { NoteEntity } from '../services/database/types';

const testNote = (title: string): NoteEntity => {
	return { title, latitude: 0, longitude: 0, altitude: 0 };
};

// Export a note to front matter, then re-import it the way
// InteropService_Importer_Md_frontmatter does.
const roundTripTitle = (title: string) => {
	const md = noteToFrontMatter(testNote(title), []);
	const note = `---\n${md}---\n\nbody`;
	return parse(note).metadata.title;
};

describe('frontMatter', () => {

	it('should round-trip titles that start with a dash', () => {
		const testCases = [
			// If the quotes added by the yaml library were trimmed, the
			// doubled inner quote would remain ("-5 o''clock"), the ": "
			// would make the header invalid YAML, and the " #" would start a
			// comment.
			'-5 o\'clock',
			'-5: totals',
			'-5 #hot',
			'-60',
			'- title with dash',
		];

		for (const title of testCases) {
			expect(roundTripTitle(title)).toBe(title);
		}
	});

	it('should not quote a plain negative number', () => {
		expect(noteToFrontMatter(testNote('-60'), [])).toContain('title: -60');
	});

	it('should keep quoting a title that looks like a list item', () => {
		expect(noteToFrontMatter(testNote('- title with dash'), [])).toContain('title: \'- title with dash\'');
	});

});
