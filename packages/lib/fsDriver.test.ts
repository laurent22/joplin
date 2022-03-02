import FsDriverNode from './fs-driver-node';
import shim from './shim';
import { expectThrow } from './testing/test-utils';

// On Windows, path.resolve is going to convert a path such as
// /tmp/file.txt to c:\tmp\file.txt
function platformPath(path: string) {
	if (shim.isWindows()) {
		return `c:${path.replace(/\//g, '\\')}`;
	} else {
		return path;
	}
}

describe('fsDriver', function() {

	it('should resolveRelativePathWithinDir', async () => {
		const fsDriver = new FsDriverNode();
		expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './my/file.txt').toLowerCase()).toBe(platformPath('/test/temp/my/file.txt'));
		expect(fsDriver.resolveRelativePathWithinDir('/', './test').toLowerCase()).toBe(platformPath('/test'));
		expect(fsDriver.resolveRelativePathWithinDir('/test', 'myfile.txt').toLowerCase()).toBe(platformPath('/test/myfile.txt'));
		expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../test.txt').toLowerCase()).toBe(platformPath('/test/temp/test.txt'));

		await expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '../myfile.txt'));
		await expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../../test.txt'));
		await expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '/var/local/no.txt'));
	});

});
