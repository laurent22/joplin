import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import { CachesDirectoryPath } from 'react-native-fs';

// when refactoring this name, make sure to refactor the `SharePackage.java` (in android) as well
const DIR_NAME = 'sharedFiles';

// Copy a file to be shared to cache, renaming it to its orignal name
export async function copyToCache(resource: ResourceEntity): Promise<string> {
	const filename = Resource.friendlySafeFilename(resource);

	const targetDir = `${CachesDirectoryPath}/${DIR_NAME}`;
	await shim.fsDriver().mkdir(targetDir);

	const targetFile = `${targetDir}/${filename}`;

	await shim.fsDriver().copy(Resource.fullPath(resource), targetFile);

	return targetFile;
}

// Clear previously shared files from cache
export async function clearSharedFilesCache(): Promise<void> {
	return shim.fsDriver().remove(`${CachesDirectoryPath}/sharedFiles`);
}
