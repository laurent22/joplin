import { describe, test, expect } from '@jest/globals';
import { pathExists } from 'fs-extra';
import { writeTextToCacheFile } from './ShareUtils';

describe('ShareUtils', () => {
	test('writeTextFileToCache should write given text to a cache file', async () => {
		const filePath1 = await writeTextToCacheFile('testing...', 'test1.txt');
		expect(await pathExists(filePath1)).toBe(true);
	});
});
