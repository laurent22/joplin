import { join } from 'path';
import FsDriverNode from './fs-driver-node';
import shim from './shim';
import { expectThrow, supportDir } from './testing/test-utils';

const windowsPartitionLetter = __filename[0];

// On Windows, path.resolve is going to convert a path such as
// /tmp/file.txt to {partition}:\tmp\file.txt
function platformPath(path: string) {
	if (shim.isWindows()) {
		return `${windowsPartitionLetter}:${path.replace(/\//g, '\\')}`;
	} else {
		return path;
	}
}

describe('fsDriver', () => {
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

	it('should compare reserved names in a case-insensitive way in findUniqueFilename', async () => {
		// Compare with filenames in the reserved list should be case insensitive
		expect(
			await shim.fsDriver().findUniqueFilename(
				join(supportDir, 'this-file-does-not-exist.txt'),
				[join(supportDir, 'THIS-file-does-not-exist.txt'), join(supportDir, 'THIS-file-DOES-not-exist (1).txt')],
			),
		).toBe(join(supportDir, 'this-file-does-not-exist (2).txt'));

		// Should still not match reserved names that aren't equivalent.
		expect(
			await shim.fsDriver().findUniqueFilename(join(supportDir, 'this-file-does-not-exist.txt'), [join(supportDir, 'some-other-file.txt')]),
		).toBe(join(supportDir, 'this-file-does-not-exist.txt'));
	});
});
