import { describe, test, expect, jest, afterAll } from '@jest/globals';
import { mkdtempSync, existsSync } from 'fs';
import { rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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
		expect(existsSync(filePath1)).toBe(true);

		const filePath2 = await writeTextToCacheFile('test 2');
		expect(filePath2).not.toBe(filePath1);
		expect(existsSync(filePath2)).toBe(true);
	});

	afterAll(async () => {
		await rmdir(tempDirectoryPath, { recursive: true });
	});
});
