import { describe, test, expect } from '@jest/globals';
import { pathExists } from 'fs-extra';
import shim from '@joplin/lib/shim';
import { makeIsolatedShareCacheDirectory, writeTextToCacheFile } from './ShareUtils';

describe('ShareUtils', () => {
	test('writeTextFileToCache should write given text to a cache file', async () => {
		const filePath1 = await writeTextToCacheFile('testing...', 'test1.txt');
		expect(await pathExists(filePath1)).toBe(true);
	});

	test('puts unlocked copies of locked notes in their own directory', async () => {
		const directory = await makeIsolatedShareCacheDirectory(true);
		try {
			expect(directory).toContain('/sharedFiles/unlocked/');
			expect(await pathExists(directory)).toBe(true);
		} finally {
			await shim.fsDriver().remove(directory);
		}
	});
});
