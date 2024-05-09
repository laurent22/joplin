import { ImportExportResult, ImportModuleOutputFormat } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import { oneNoteConverter } from '@joplin/onenote-converter';
import * as AdmZip from 'adm-zip';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import shim from '../../shim';

export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	public async exec(result: ImportExportResult) {

		const sourcePath = rtrimSlashes(this.sourcePath_);
		const unzipTempDirectory = await this.temporaryDirectory_(true);
		const zip = new AdmZip(sourcePath);
		zip.extractAllTo(unzipTempDirectory, false);

		const files = zip.getEntries();
		if (files.length === 0) {
			return result.warnings.push('Zip file has no files.');
		}

		const baseFolderFromBackup = shim.getParentFolderName(files[0].entryName);

		// files that don't have a name seems to be local only and shouldn't be processed
		const notebookFiles = zip.getEntries()
			.filter(e => e.name !== '.onetoc2' && e.name !== 'OneNote_RecycleBin.onetoc2');
		const tableOfContentFiles = notebookFiles.filter(n => n.name.endsWith('.onetoc2'));

		const validNotebookFiles = tableOfContentFiles.length ? tableOfContentFiles : notebookFiles;

		const outputDirectory = await this.temporaryDirectory_(true);
		for (const notebookFile of validNotebookFiles) {
			const notebookBaseDir = `${unzipTempDirectory}/${baseFolderFromBackup}/`;
			const notebookFilePath = `${unzipTempDirectory}/${notebookFile.entryName}`;
			try {
				await oneNoteConverter(notebookFilePath, outputDirectory, notebookBaseDir);
			} catch (error) {
				console.error(error);
			}
		}

		const importer = new InteropService_Importer_Md();
		importer.setMetadata({ fileExtensions: ['html'] });
		await importer.init(outputDirectory, {
			...this.options_,
			format: 'html',
			outputFormat: ImportModuleOutputFormat.Html,

		});
		result = await importer.exec(result);

		// remover temp directories?
		return result;
	}
}
