import Folder from '@joplin/lib/models/Folder';
import InteropService from '@joplin/lib/services/interop/InteropService';
import { ExportModuleOutputFormat, ExportOptions, FileSystemItem, OnExportProgressCallback } from '@joplin/lib/services/interop/types';

const exportFolders = async (path: string, onProgress: OnExportProgressCallback) => {
	const folders = await Folder.all();

	const sourceFolderIds = folders.map(folder => folder.id);
	const exportOptions: ExportOptions = {
		sourceFolderIds,
		path,
		format: ExportModuleOutputFormat.Jex,
		target: FileSystemItem.File,
		onProgress,
	};

	return await InteropService.instance().export(exportOptions);
};

export default exportFolders;
