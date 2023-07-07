import Folder from '@joplin/lib/models/Folder';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';
import shim from '@joplin/lib/shim';
import InteropService_Exporter_Jex from '@joplin/lib/services/interop/InteropService_Exporter_Jex';

import { CachesDirectoryPath } from 'react-native-fs';
export const makeExportCacheDirectory = async () => {
	const targetDir = `${CachesDirectoryPath}/exports`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

const exportFolders = async (path: string) => {
	const folders = await Folder.all();

	const sourceFolderIds = folders.map(folder => folder.id);
	const exportOptions: ExportOptions = {
		sourceFolderIds,
		path,
		format: 'jex',
		target: FileSystemItem.File,
		exporter: new InteropService_Exporter_Jex(),
	};

	return await InteropService.instance().export(exportOptions);
};

export default exportFolders;
