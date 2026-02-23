import { getResourceIdFromMarkup } from './useContextMenu';

describe('useContextMenu', () => {
	const resourceId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
	const resourceId2 = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5';

	it('should return type=image when cursor is inside markdown image', () => {
		const line = `![alt text](:/${resourceId})`;
		expect(getResourceIdFromMarkup(line, 15)).toEqual({ resourceId, type: 'image' });
	});

	it('should return type=file when cursor is inside markdown link', () => {
		const line = `[document.pdf](:/${resourceId})`;
		expect(getResourceIdFromMarkup(line, 15)).toEqual({ resourceId, type: 'file' });
	});

	it('should return null when cursor is outside markup', () => {
		const line = `Some text ![alt](:/${resourceId}) more text`;
		expect(getResourceIdFromMarkup(line, 5)).toBeNull();
		expect(getResourceIdFromMarkup(line, line.length - 5)).toBeNull();
	});

	it('should correctly distinguish between image and file on same line', () => {
		const line = `![image](:/${resourceId}) [file](:/${resourceId2})`;
		expect(getResourceIdFromMarkup(line, 10)).toEqual({ resourceId, type: 'image' });
		expect(getResourceIdFromMarkup(line, 48)).toEqual({ resourceId: resourceId2, type: 'file' });
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
