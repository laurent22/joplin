const mimeUtils = require('./mime-utils.js').mime;

describe('mimeUils', function() {

	beforeEach(async (done) => {
		done();
	});

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

	it('should append a file extension to a filename', (async () => {
		expect(mimeUtils.appendExtensionFromMime('test', 'image/jpeg')).toBe('test.jpg');
		expect(mimeUtils.appendExtensionFromMime('test.bmp', 'image/jpeg')).toBe('test.bmp.jpg');
		expect(mimeUtils.appendExtensionFromMime('test.JPG', 'image/jpeg')).toBe('test.JPG');
		expect(mimeUtils.appendExtensionFromMime('test.jpeg', 'image/jpeg')).toBe('test.jpeg');
		expect(mimeUtils.appendExtensionFromMime('test', 'image/doesntexist')).toBe('test.bin');
	}));

});
