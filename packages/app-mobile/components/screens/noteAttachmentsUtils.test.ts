import { ResourceEntity } from '@joplin/lib/services/database/types';
import { buildResourceMarkdownLink, nextSortState } from './noteAttachmentsUtils';

describe('noteAttachmentsUtils', () => {
	test.each([
		['title', 'asc', 'title', { sortField: 'title', sortDirection: 'desc' }],
		['size', 'desc', 'size', { sortField: 'size', sortDirection: 'asc' }],
		['title', 'asc', 'size', { sortField: 'size', sortDirection: 'desc' }],
		['size', 'asc', 'title', { sortField: 'title', sortDirection: 'desc' }],
	] as const)('nextSortState(%s, %s, %s) should return %j', (currentField, currentDirection, nextField, expectedState) => {
		expect(nextSortState(currentField, currentDirection, nextField)).toEqual(expectedState);
	});

	test.each([
		[
			{
				id: 'c78cfd6ea4de4be694eccae146a42d99',
				title: 'photo.jpg',
			} as ResourceEntity,
			'![photo.jpg](:/c78cfd6ea4de4be694eccae146a42d99)',
		],
		[
			{
				id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				title: '[spec](x)',
			} as ResourceEntity,
			'![\\[spec\\](x)](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
		],
	])('buildResourceMarkdownLink should return %s', (resource, expectedMarkdown) => {
		expect(buildResourceMarkdownLink(resource)).toBe(expectedMarkdown);
	});

	test('buildResourceMarkdownLink should return empty string without a resource id', () => {
		expect(buildResourceMarkdownLink({ title: 'photo.jpg' } as ResourceEntity)).toBe('');
	});
});
