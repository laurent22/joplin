const mimeUtils = require('./mime-utils.js');

describe('mimeUtils', () => {



	it('should get the file extension from the mime type', (async () => {
		expect(mimeUtils.toFileExtension('image/jpeg')).toBe('jpg');
		expect(mimeUtils.toFileExtension('image/jpg')).toBe('jpg');
		expect(mimeUtils.toFileExtension('IMAGE/JPG')).toBe('jpg');
		expect(mimeUtils.toFileExtension('')).toBe(null);
	}));

	it('should get the mime type from the filename', (async () => {
		expect(mimeUtils.fromFilename('test.jpg')).toBe('image/jpeg');
		expect(mimeUtils.fromFilename('test.JPG')).toBe('image/jpeg');
		expect(mimeUtils.fromFilename('test.doesntexist')).toBe(null);
		expect(mimeUtils.fromFilename('test')).toBe(null);
	}));

	it.each([
		['Not a data URL.', 'text/plain'],
		// No encoding type
		['data:image/svg+xml,%3csvg%3e%3cpath fill=\'%23fff\' d=\'M1,2,3z\'/%3e%3c/svg%3e', 'image/svg+xml'],
		// Shouldn't need a full data URL
		['data:image/jpeg;base64,/9j/4AAQSkZJR...', 'image/jpeg'],
		['data:image/png;base64,iVBORw0KGgoAAAANSUhEU...', 'image/png'],
	])('should get MIME types from data URLs (case %#)', (url, expected) => {
		expect(mimeUtils.fromDataUrl(url)).toBe(expected);
	});

});
