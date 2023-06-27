import { describe, test, expect } from '@jest/globals';
import { mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import shim from '@joplin/lib/shim';

// react-native-fs's CachesDirectoryPath export doesn't work in a testing environment.
// Use a temporary file instead.
const tempDirectoryPath = mkdtempSync(join(tmpdir(), 'ShareUtilsTest'));
jest.mock('react-native-fs', () => {
	return {
		CachesDirectoryPath: tempDirectoryPath,
	};
});

// Imports that might use the react-native-fs mock
import { writeTextToCacheFile } from './ShareUtils';

describe('ShareUtils', () => {
	test('writeTextFileToCache should create a new, uniquely-named file', async () => {
		const filePath1 = await writeTextToCacheFile('testing...');
		expect(await shim.fsDriver().exists(filePath1)).toBe(true);

		const filePath2 = await writeTextToCacheFile('test 2');
		expect(filePath2).not.toBe(filePath1);
		expect(await shim.fsDriver().exists(filePath2)).toBe(true);
	});

	afterAll(() => {
		rmdirSync(tempDirectoryPath, { recursive: true });
	});
});
