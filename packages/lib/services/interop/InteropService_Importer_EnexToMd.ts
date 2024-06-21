import { ImportExportResult, ImportOptions } from './types';
import importEnex from '../../import-enex';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import Folder from '../../models/Folder';
import { FolderEntity } from '../database/types';
import { fileExtension, rtrimSlashes } from '../../path-utils';
import shim from '../../shim';
const { filename } = require('../../path-utils');

const doImportEnex = async (destFolder: FolderEntity, sourcePath: string, options: ImportOptions) => {
	if (!destFolder) {
		const folderTitle = await Folder.findUniqueItemTitle(filename(sourcePath));
		destFolder = await Folder.save({ title: folderTitle });
	}

	await importEnex(destFolder.id, sourcePath, options);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const enexImporterExec = async (result: ImportExportResult, destinationFolder: FolderEntity, sourcePath: string, fileExtensions: string[], options: any) => {
	sourcePath = rtrimSlashes(sourcePath);

	if (await shim.fsDriver().isDirectory(sourcePath)) {
		const stats = await shim.fsDriver().readDirStats(sourcePath);
		for (const stat of stats) {
			const fullPath = `${sourcePath}/${stat.path}`;
			if (!fileExtensions.includes(fileExtension(fullPath).toLowerCase())) continue;

			try {
				await doImportEnex(null, fullPath, options);
			} catch (error) {
				result.warnings.push(`When importing "${fullPath}": ${error.message}`);
			}
		}
	} else {
		await doImportEnex(destinationFolder, sourcePath, options);
	}

	return result;
};

export default class InteropService_Importer_EnexToMd extends InteropService_Importer_Base {
	public async exec(result: ImportExportResult) {
		return enexImporterExec(
			result,
			this.options_.destinationFolder,
			this.sourcePath_,
			this.metadata().fileExtensions,
			this.options_,
		);
	}

}
