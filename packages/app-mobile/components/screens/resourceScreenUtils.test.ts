import { ResourceEntity } from '@joplin/lib/services/database/types';
import { buildResourceMarkdownLink, nextSortState } from './resourceScreenUtils';

describe('resourceScreenUtils', () => {
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
				mime: 'image/jpeg',
			} as ResourceEntity,
			'![photo.jpg](:/c78cfd6ea4de4be694eccae146a42d99)',
		],
		[
			{
				id: '11111111111111111111111111111111',
				title: 'screenshot.png',
				mime: 'image/png',
			} as ResourceEntity,
			'![screenshot.png](:/11111111111111111111111111111111)',
		],
		[
			{
				id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				title: '[spec](x)',
				mime: 'application/pdf',
			} as ResourceEntity,
			'[\\[spec\\](x)](:/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)',
		],
		[
			{
				id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				title: 'archive.zip',
				mime: 'application/zip',
			} as ResourceEntity,
			'[archive.zip](:/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)',
		],
		[
			{
				id: '22222222222222222222222222222222',
				title: 'notes.txt',
				mime: 'text/plain',
			} as ResourceEntity,
			'[notes.txt](:/22222222222222222222222222222222)',
		],
		[
			{
				id: '33333333333333333333333333333333',
				title: 'voice.mp3',
				mime: 'audio/mpeg',
			} as ResourceEntity,
			'[voice.mp3](:/33333333333333333333333333333333)',
		],
		[
			{
				id: '44444444444444444444444444444444',
				title: 'clip.mp4',
				mime: 'video/mp4',
			} as ResourceEntity,
			'[clip.mp4](:/44444444444444444444444444444444)',
		],
		[
			{
				id: '55555555555555555555555555555555',
				title: 'binary.bin',
				mime: 'application/octet-stream',
			} as ResourceEntity,
			'[binary.bin](:/55555555555555555555555555555555)',
		],
		[
			{
				id: '66666666666666666666666666666666',
				title: 'unknown-type.dat',
				mime: '',
			} as ResourceEntity,
			'[unknown-type.dat](:/66666666666666666666666666666666)',
		],
	])('buildResourceMarkdownLink should return %s', (resource, expectedMarkdown) => {
		expect(buildResourceMarkdownLink(resource)).toBe(expectedMarkdown);
	});

	test('buildResourceMarkdownLink should return empty string without a resource id', () => {
		expect(buildResourceMarkdownLink({ title: 'photo.jpg' } as ResourceEntity)).toBe('');
	});
});
