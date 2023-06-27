import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import { CachesDirectoryPath } from 'react-native-fs';
import { Mutex } from 'async-mutex';

// when refactoring this name, make sure to refactor the `SharePackage.java` (in android) as well
const DIR_NAME = 'sharedFiles';

const makeShareCacheDirectory = async () => {
	const targetDir = `${CachesDirectoryPath}/${DIR_NAME}`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

/**
 * Copy a file to be shared to cache, renaming it to its orignal name
 */
export async function copyToCache(resource: ResourceEntity): Promise<string> {
	const filename = Resource.friendlySafeFilename(resource);

	const targetDir = await makeShareCacheDirectory();
	const targetFile = `${targetDir}/${filename}`;

	await shim.fsDriver().copy(Resource.fullPath(resource), targetFile);

	return targetFile;
}

const writeNextCacheFileMutex = new Mutex();

// Writes the given text to a new temporary cache file and returns the file path.
export async function writeTextToCacheFile(text: string): Promise<string> {
	const targetDir = await makeShareCacheDirectory();

	const releaseLock = await writeNextCacheFileMutex.acquire();
	let filePath;

	try {
		// Find an unused filename
		let nextTmpFileId = 0;
		do {
			filePath = `${targetDir}/tmp-share-file.${nextTmpFileId}.txt`;
			nextTmpFileId++;
		}
		while (await shim.fsDriver().exists(filePath));

		await shim.fsDriver().writeFile(filePath, text, 'utf8');
	} finally {
		releaseLock();
	}

	return filePath;
}

/**
 * Clear previously shared files from cache
 */
export async function clearSharedFilesCache(): Promise<void> {
	return shim.fsDriver().remove(`${CachesDirectoryPath}/sharedFiles`);
}
