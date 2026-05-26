import { ResourceEntity } from '../../services/database/types';
import { resourceFilename } from './resourceUtils';

describe('resourceUtils', () => {

	it('should build a filename from id and extension', () => {
		const resource: ResourceEntity = { id: '00000000000000000000000000000001', file_extension: 'txt' };
		expect(resourceFilename(resource)).toBe('00000000000000000000000000000001.txt');
	});

	it.each([
		{ id: '../../escape', file_extension: 'txt' },
		{ id: 'foo/bar', file_extension: 'txt' },
		{ id: '00000000000000000000000000000001', file_extension: '../foo.txt' },
		{ id: '00000000000000000000000000000001', file_extension: 'foo/bar' },
		{ id: '00000000000000000000000000000001', file_extension: 'foo\\bar' },
	])('should reject filenames containing path separators or parent segments (%j)', (resource) => {
		expect(() => resourceFilename(resource as ResourceEntity)).toThrow(/Invalid resource filename/);
	});
});
