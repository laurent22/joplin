import { ResourceEntity } from '@joplin/lib/services/database/types';
import { buildResourceMarkdownLink, nextSortState } from './noteAttachmentsUtils';

describe('noteAttachmentsUtils', () => {
	test('nextSortState should toggle direction when keeping the same field', () => {
		expect(nextSortState('title', 'asc', 'title')).toEqual({ sortField: 'title', sortDirection: 'desc' });
		expect(nextSortState('size', 'desc', 'size')).toEqual({ sortField: 'size', sortDirection: 'asc' });
	});

	test('nextSortState should switch field and reset direction to desc', () => {
		expect(nextSortState('title', 'asc', 'size')).toEqual({ sortField: 'size', sortDirection: 'desc' });
		expect(nextSortState('size', 'asc', 'title')).toEqual({ sortField: 'title', sortDirection: 'desc' });
	});

	test('buildResourceMarkdownLink should return an image markdown link with title', () => {
		const markdown = buildResourceMarkdownLink({
			id: 'c78cfd6ea4de4be694eccae146a42d99',
			title: 'photo.jpg',
		} as ResourceEntity);

		expect(markdown).toBe('![photo.jpg](:/c78cfd6ea4de4be694eccae146a42d99)');
	});

	test('buildResourceMarkdownLink should escape markdown title text', () => {
		const markdown = buildResourceMarkdownLink({
			id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			title: '[spec](x)',
		} as ResourceEntity);

		expect(markdown).toBe('![\\[spec\\](x)](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)');
	});

	test('buildResourceMarkdownLink should return empty string without a resource id', () => {
		expect(buildResourceMarkdownLink({ title: 'photo.jpg' } as ResourceEntity)).toBe('');
	});
});
