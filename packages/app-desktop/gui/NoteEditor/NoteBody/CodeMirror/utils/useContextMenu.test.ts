import { getResourceIdFromMarkup } from './useContextMenu';

describe('useContextMenu', () => {
	const resourceId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
	const resourceId2 = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5';

	it('should return resource ID when cursor is inside markdown image', () => {
		const line = `![alt text](:/${resourceId})`;
		expect(getResourceIdFromMarkup(line, 0)).toBe(resourceId);
		expect(getResourceIdFromMarkup(line, 15)).toBe(resourceId);
		expect(getResourceIdFromMarkup(line, line.length - 1)).toBe(resourceId);
	});

	it('should return null when cursor is outside markdown image', () => {
		const line = `Some text ![alt](:/${resourceId}) more text`;
		expect(getResourceIdFromMarkup(line, 5)).toBeNull();
		expect(getResourceIdFromMarkup(line, line.length - 5)).toBeNull();
	});

	it('should handle markdown image without alt text', () => {
		const line = `![](:/${resourceId})`;
		expect(getResourceIdFromMarkup(line, 5)).toBe(resourceId);
	});

	it('should return resource ID when cursor is inside HTML img tag', () => {
		const line = `<img src=":/${resourceId}" />`;
		expect(getResourceIdFromMarkup(line, 10)).toBe(resourceId);
	});

	it('should handle HTML img tag with additional attributes', () => {
		const line = `<img alt="test" src=":/${resourceId}" width="100" />`;
		expect(getResourceIdFromMarkup(line, 25)).toBe(resourceId);
	});

	it('should return null when cursor is outside HTML img tag', () => {
		const line = `text <img src=":/${resourceId}" /> more`;
		expect(getResourceIdFromMarkup(line, 2)).toBeNull();
		expect(getResourceIdFromMarkup(line, line.length - 2)).toBeNull();
	});

	it('should return correct resource ID when multiple images on same line', () => {
		const line = `![first](:/${resourceId}) ![second](:/${resourceId2})`;
		expect(getResourceIdFromMarkup(line, 10)).toBe(resourceId);
		expect(getResourceIdFromMarkup(line, 50)).toBe(resourceId2);
	});

	it('should return null for empty line', () => {
		expect(getResourceIdFromMarkup('', 0)).toBeNull();
	});

	it('should return null for line without images', () => {
		expect(getResourceIdFromMarkup('Just some regular text', 10)).toBeNull();
	});

	it('should return null for non-resource links', () => {
		const line = '![alt](https://example.com/image.png)';
		expect(getResourceIdFromMarkup(line, 10)).toBeNull();
	});

	it('should handle cursor at exact boundaries of image markup', () => {
		const line = `![a](:/${resourceId})`;
		expect(getResourceIdFromMarkup(line, 0)).toBe(resourceId);
		expect(getResourceIdFromMarkup(line, line.length)).toBe(resourceId);
	});
});
