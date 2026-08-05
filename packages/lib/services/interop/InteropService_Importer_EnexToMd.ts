import { ImportExportResult, ImportOptions } from './types';
import importEnex, { restoreEnexNoteLinks } from '../../import-enex';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import Folder from '../../models/Folder';
import { FolderEntity } from '../database/types';
import { fileExtension, rtrimSlashes } from '../../path-utils';
import shim from '../../shim';
import { filename } from '../../path-utils';
import Note from '../../models/Note';

const doImportEnex = async (destFolder: FolderEntity, sourcePath: string, options: ImportOptions) => {
	if (!destFolder) {
		const folderTitle = await Folder.findUniqueItemTitle(filename(sourcePath));
		destFolder = await Folder.save({ title: folderTitle });
	}

	return await importEnex(destFolder.id, sourcePath, options);
};

const restoreLinks = async (noteIds: string[], importOptions: ImportOptions) => {
	const readNotes = async function*() {
		for (const id of noteIds) {
			const note = await Note.load(id, { fields: ['id', 'body'] });
			yield { id: note.id, body: note.body };
		}
	};
	const titleToIds = async (title: string) => {
		const notes = await Note.allByTitleAndApplication({ title, application: 'evernote', fields: ['id'], includeDeleted: false });
		return notes.map(n => n.id);
	};

	await restoreEnexNoteLinks(
		readNotes(),
		titleToIds,
		importOptions,
	);
};

export const enexImporterExec = async (result: ImportExportResult, destinationFolder: FolderEntity, sourcePath: string, fileExtensions: string[], options: ImportOptions) => {
	sourcePath = rtrimSlashes(sourcePath);

	const notesWithUnresolvedLinks = [];

	if (await shim.fsDriver().isDirectory(sourcePath)) {
		const stats = await shim.fsDriver().readDirStats(sourcePath);
		for (const stat of stats) {
			const fullPath = `${sourcePath}/${stat.path}`;
			if (!fileExtensions.includes(fileExtension(fullPath).toLowerCase())) continue;

			try {
				const importResult = await doImportEnex(null, fullPath, options);
				notesWithUnresolvedLinks.push(...importResult.noteIdsWithUnresolvedLinks);
			} catch (error) {
				result.warnings.push(`When importing "${fullPath}": ${error.message}`);
			}
		}
	} else {
		const importResult = await doImportEnex(destinationFolder, sourcePath, options);
		notesWithUnresolvedLinks.push(...importResult.noteIdsWithUnresolvedLinks);
	}

	await restoreLinks(notesWithUnresolvedLinks, options);

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
