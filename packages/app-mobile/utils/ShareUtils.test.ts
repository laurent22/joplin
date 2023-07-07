import { describe, test, expect, jest, afterAll, beforeAll } from '@jest/globals';
import { pathExists, mkdir, rmdir } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import uuid from '@joplin/lib/uuid';

// react-native-fs's CachesDirectoryPath export doesn't work in a testing environment.
// Use a temporary file instead.
const tempDirectoryPath = join(tmpdir(), `ShareUtilsTest-${uuid.createNano()}`);
jest.mock('react-native-fs', () => {
	return {
		CachesDirectoryPath: tempDirectoryPath,
	};
});

// Imports that might use the react-native-fs mock
import { writeTextToCacheFile } from './ShareUtils';

describe('ShareUtils', () => {
	beforeAll(async () => {
		await mkdir(tempDirectoryPath);
	});

	test('writeTextFileToCache should create a new, uniquely-named file', async () => {
		const filePath1 = await writeTextToCacheFile('testing...');
		expect(await pathExists(filePath1)).toBe(true);

		const filePath2 = await writeTextToCacheFile('test 2');
		expect(filePath2).not.toBe(filePath1);
		expect(await pathExists(filePath2)).toBe(true);
	});

	afterAll(async () => {
		await rmdir(tempDirectoryPath, { recursive: true });
	});
});
