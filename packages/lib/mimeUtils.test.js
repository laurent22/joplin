const mimeUtils = require('./mime-utils.js').mime;

describe('mimeUils', () => {



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

});
