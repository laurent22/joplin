
import shim from '@joplin/lib/shim';
import { CachesDirectoryPath } from 'react-native-fs';

const makeImportExportCacheDirectory = async () => {
	const targetDir = `${CachesDirectoryPath}/exports`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

export default makeImportExportCacheDirectory;
