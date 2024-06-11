import { remove, writeFile } from 'fs-extra';
import { createTempDir } from '@joplin/lib/testing/test-utils';
import { join } from 'path';
import isSafeToOpen from './isSafeToOpen';


describe('isSafeToOpen', () => {
	test.each([
		{ fileName: 'a.txt', expected: true },
		{ fileName: 'a.json', expected: true },
		{ fileName: 'a.JSON', expected: true },
		{ fileName: 'a.tar.gz', expected: true },
		{ fileName: 'a.exe', expected: false },
		{ fileName: 'test.com', expected: false },
		{ fileName: 'a.pyc', expected: false },
		{ fileName: 'a.pyo', expected: false },
		{ fileName: 'a.pyw', expected: false },
		{ fileName: 'a.jar', expected: false },
		{ fileName: 'a.bat', expected: false },
		{ fileName: 'a.cmd', expected: false },
		{ fileName: 'noExtension', expected: false },
	])('should mark executable files as possibly unsafe to open (%j)', async ({ fileName, expected }) => {
		const tempDir = await createTempDir();
		try {
			const fullPath = join(tempDir, fileName);
			await writeFile(fullPath, 'test');
			expect(await isSafeToOpen(fullPath)).toBe(expected);
		} finally {
			await remove(tempDir);
		}
	});
});
