import { getResourceIdFromMarkup } from './useContextMenu';

describe('useContextMenu', () => {
	const resourceId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
	const resourceId2 = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5';

	it('should return type=image when cursor is inside markdown image', () => {
		const line = `![alt text](:/${resourceId})`;
		const result = getResourceIdFromMarkup(line, 15);
		expect(result.resourceId).toBe(resourceId);
		expect(result.type).toBe('image');
		expect(line.substring(result.markupStart, result.markupEnd)).toBe(line);
	});

	it('should return type=file when cursor is inside markdown link', () => {
		const line = `[document.pdf](:/${resourceId})`;
		const result = getResourceIdFromMarkup(line, 15);
		expect(result.resourceId).toBe(resourceId);
		expect(result.type).toBe('file');
		expect(line.substring(result.markupStart, result.markupEnd)).toBe(line);
	});

	it('should return null when cursor is outside markup', () => {
		const line = `Some text ![alt](:/${resourceId}) more text`;
		expect(getResourceIdFromMarkup(line, 5)).toBeNull();
		expect(getResourceIdFromMarkup(line, line.length - 5)).toBeNull();
	});

	it('should correctly distinguish between image and file on same line', () => {
		const line = `![image](:/${resourceId}) [file](:/${resourceId2})`;
		const imageResult = getResourceIdFromMarkup(line, 10);
		expect(imageResult.resourceId).toBe(resourceId);
		expect(imageResult.type).toBe('image');

		const fileResult = getResourceIdFromMarkup(line, 48);
		expect(fileResult.resourceId).toBe(resourceId2);
		expect(fileResult.type).toBe('file');
	});

	it('should return null for empty line', () => {
		expect(getResourceIdFromMarkup('', 0)).toBeNull();
	});

	it('should return null for line without resources', () => {
		expect(getResourceIdFromMarkup('Just some regular text', 10)).toBeNull();
	});

	it('should return null for non-resource URLs', () => {
		expect(getResourceIdFromMarkup('![alt](https://example.com/image.png)', 10)).toBeNull();
		expect(getResourceIdFromMarkup('[link](https://example.com)', 10)).toBeNull();
	});
});
