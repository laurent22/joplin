import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';

// when refactoring this name, make sure to refactor the `SharePackage.java` (in android) as well
const DIR_NAME = 'sharedFiles';

let pendingUnlockedShareCleanup: Promise<void> = Promise.resolve();

const makeShareCacheDirectory = async () => {
	const targetDir = `${shim.fsDriver().getCacheDirectoryPath()}/${DIR_NAME}`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

export const makeIsolatedShareCacheDirectory = async (fromLockedNote = false) => {
	if (fromLockedNote) await pendingUnlockedShareCleanup;
	// Keep each share's files separate so they cannot conflict and can be cleaned up independently.
	const targetDir = `${await makeShareCacheDirectory()}${fromLockedNote ? '/unlocked' : ''}/${uuid.create()}`;
	await shim.fsDriver().mkdir(targetDir);
	return targetDir;
};

// Copy a file to be shared to cache, renaming it to its orignal name
export async function copyToCache(resource: ResourceEntity): Promise<string> {
	const filename = Resource.friendlySafeFilename(resource);

	const targetDir = await makeShareCacheDirectory();
	const targetFile = `${targetDir}/${filename}`;

	await shim.fsDriver().copy(Resource.fullPath(resource), targetFile);

	return targetFile;
}

// fileName should be unique -- any file with fileName will be overwritten if it already exists.
export const writeTextToCacheFile = async (text: string, fileName: string): Promise<string> => {
	const targetDir = await makeShareCacheDirectory();

	const filePath = `${targetDir}/${fileName}`;
	await shim.fsDriver().writeFile(filePath, text, 'utf8');

	return filePath;
};

// Clear previously shared files from cache
export async function clearSharedFilesCache(): Promise<void> {
	return shim.fsDriver().remove(`${shim.fsDriver().getCacheDirectoryPath()}/sharedFiles`);
}

export function clearUnlockedSharedFilesCache(): Promise<void> {
	const previousCleanup = pendingUnlockedShareCleanup;
	const cleanup = (async () => {
		// An earlier failed cleanup has already been reported by its caller. Still try again.
		try {
			await previousCleanup;
		} catch {
			// Retry below.
		}
		await shim.fsDriver().remove(`${shim.fsDriver().getCacheDirectoryPath()}/${DIR_NAME}/unlocked`);
	})();
	pendingUnlockedShareCleanup = cleanup;
	return cleanup;
}
