import FsDriverNode from 'lib/fs-driver-node';
const { expectThrow } = require('test-utils.js');

describe('fsDriver', function() {

	it('should resolveRelativePathWithinDir', () => {
		const fsDriver = new FsDriverNode();
		expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './my/file.txt')).toBe('/test/temp/my/file.txt');
		expect(fsDriver.resolveRelativePathWithinDir('/', './test')).toBe('/test');
		expect(fsDriver.resolveRelativePathWithinDir('/test', 'myfile.txt')).toBe('/test/myfile.txt');
		expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../test.txt')).toBe('/test/temp/test.txt');

		expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '../myfile.txt'));
		expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../../test.txt'));
		expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '/var/local/no.txt'));
	});

});
