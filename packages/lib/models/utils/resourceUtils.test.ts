import { resourceFilename } from './resourceUtils';

describe('resourceUtils', () => {
	it.each([
		{
			id: 'this/is a test',
			mime: 'text/plain',
			expected: 'this_is_a_test.txt',
		},
		{
			id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			mime: 'application/json',
			expected: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json',
		},
	])('should correctly determine resource filenames (case %#)', ({ id, mime, expected }) => {
		expect(resourceFilename({ id, mime })).toBe(expected);
	});
});
