import { parseReleaseNotes } from './releaseNotesParser';

describe('releaseNotesParser', () => {

	it('should return empty array for empty or null input', () => {
		expect(parseReleaseNotes('')).toEqual([]);
		expect(parseReleaseNotes(null)).toEqual([]);
	});

	it('should parse a heading', () => {
		expect(parseReleaseNotes('## What\'s New')).toEqual([
			{ type: 'heading', level: 2, content: 'What\'s New' },
		]);
	});

	it('should parse list items', () => {
		expect(parseReleaseNotes('- Item one\n- Item two')).toEqual([
			{ type: 'list-item', content: 'Item one' },
			{ type: 'list-item', content: 'Item two' },
		]);
	});

	it('should parse a horizontal rule', () => {
		expect(parseReleaseNotes('---')).toEqual([{ type: 'hr' }]);
	});

	it('should strip GitHub noise (issue numbers, commit hashes, author attributions)', () => {
		const input = [
			'- Fixed bug (#4727)',
			'- Added feature (#3157 by [@user](https://github.com/user))',
			'- Improved sync (a6caa35)',
		].join('\n');
		expect(parseReleaseNotes(input)).toEqual([
			{ type: 'list-item', content: 'Fixed bug' },
			{ type: 'list-item', content: 'Added feature' },
			{ type: 'list-item', content: 'Improved sync' },
		]);
	});

	it('should skip lines that are empty after cleaning', () => {
		expect(parseReleaseNotes('- (#4727)')).toEqual([]);
	});

	it('should handle mixed content', () => {
		const result = parseReleaseNotes('## v3.2.1\n- Note editor improvements\n---\n### Bug Fixes\n- Fixed crash (#1234)');
		expect(result).toEqual([
			{ type: 'heading', level: 2, content: 'v3.2.1' },
			{ type: 'list-item', content: 'Note editor improvements' },
			{ type: 'hr' },
			{ type: 'heading', level: 3, content: 'Bug Fixes' },
			{ type: 'list-item', content: 'Fixed crash' },
		]);
	});

});
