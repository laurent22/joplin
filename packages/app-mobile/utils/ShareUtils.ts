import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import { CachesDirectoryPath } from 'react-native-fs';

// when refactoring this name, make sure to refactor the `SharePackage.java` (in android) as well
const DIR_NAME = 'sharedFiles';

const makeShareCacheDirectory = async () => {
	const targetDir = `${CachesDirectoryPath}/${DIR_NAME}`;
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
	return shim.fsDriver().remove(`${CachesDirectoryPath}/sharedFiles`);
}
