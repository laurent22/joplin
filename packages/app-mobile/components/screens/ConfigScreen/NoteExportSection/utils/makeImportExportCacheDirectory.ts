
import shim from '@joplin/lib/shim';

const makeImportExportCacheDirectory = async () => {
	const targetDir = `${shim.fsDriver().getCacheDirectoryPath()}/exports`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

export default makeImportExportCacheDirectory;
