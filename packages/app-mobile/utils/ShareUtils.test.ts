import { describe, test, expect } from '@jest/globals';
import { pathExists } from 'fs-extra';
import shim from '@joplin/lib/shim';
import { clearUnlockedSharedFilesCache, makeIsolatedShareCacheDirectory, writeTextToCacheFile } from './ShareUtils';

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

	test('clears unlocked copies without removing other shared files', async () => {
		const unlockedDirectory = await makeIsolatedShareCacheDirectory(true);
		const ordinaryDirectory = await makeIsolatedShareCacheDirectory();
		try {
			await shim.fsDriver().writeFile(`${unlockedDirectory}/note.html`, 'decrypted', 'utf8');
			await shim.fsDriver().writeFile(`${ordinaryDirectory}/note.html`, 'ordinary', 'utf8');

			await clearUnlockedSharedFilesCache();

			expect(await pathExists(unlockedDirectory)).toBe(false);
			expect(await pathExists(`${ordinaryDirectory}/note.html`)).toBe(true);
		} finally {
			await shim.fsDriver().remove(ordinaryDirectory);
		}
	});

	test('waits for relock cleanup before creating a new unlocked share directory', async () => {
		const driver = shim.fsDriver();
		const previousDirectory = await makeIsolatedShareCacheDirectory(true);
		const originalRemove = driver.remove.bind(driver);
		let releaseCleanup: ()=> void;
		const cleanupGate = new Promise<void>(resolve => { releaseCleanup = resolve; });
		let signalCleanupStarted: ()=> void;
		const cleanupStarted = new Promise<void>(resolve => { signalCleanupStarted = resolve; });
		const removeSpy = jest.spyOn(driver, 'remove').mockImplementation(async path => {
			if (path.endsWith('/sharedFiles/unlocked')) {
				signalCleanupStarted();
				await cleanupGate;
			}
			await originalRemove(path);
		});
		const mkdirSpy = jest.spyOn(driver, 'mkdir');
		const cleanup = clearUnlockedSharedFilesCache();
		let creating: Promise<string>|null = null;
		try {
			await cleanupStarted;
			mkdirSpy.mockClear();
			creating = makeIsolatedShareCacheDirectory(true);
			expect(mkdirSpy).not.toHaveBeenCalled();

			releaseCleanup();
			await cleanup;
			const newDirectory = await creating;
			expect(await pathExists(previousDirectory)).toBe(false);
			expect(await pathExists(newDirectory)).toBe(true);
		} finally {
			releaseCleanup();
			await cleanup;
			if (creating) await driver.remove(await creating);
			mkdirSpy.mockRestore();
			removeSpy.mockRestore();
		}
	});
});
