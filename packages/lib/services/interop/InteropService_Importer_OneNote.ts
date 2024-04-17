import { ImportExportResult, ImportModuleOutputFormat } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import { oneNoteConverter } from '@joplin/onenote-converter';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import * as AdmZip from 'adm-zip';

export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	public async exec(result: ImportExportResult) {

		const sourcePath = rtrimSlashes(this.sourcePath_);
		const unzipTempDirectory = await this.temporaryDirectory_(true);
		const zip = new AdmZip(sourcePath);
		zip.extractAllTo(unzipTempDirectory, false);

		// files that don't have a name seems to be local only and shouldn't be processed
		const notebookFiles = zip.getEntries()
			.filter(e => e.entryName.endsWith('.onetoc2') && e.name !== '.onetoc2' && e.name !== 'OneNote_RecycleBin.onetoc2');

		const validNotebookFiles = notebookFiles.length ? notebookFiles : zip.getEntries();

		const outputDirectory = await this.temporaryDirectory_(true);
		for (const notebookFile of validNotebookFiles) {
			const notebookFilePath = `${unzipTempDirectory}/${notebookFile.entryName}`;
			try {
				await oneNoteConverter(notebookFilePath, outputDirectory);
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
