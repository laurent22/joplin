import { ImportExportResult, ImportModuleOutputFormat } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import { oneNoteConverter } from '@joplin/onenote-converter';
import * as AdmZip from 'adm-zip';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import { join, resolve } from 'path';
import Logger from '@joplin/utils/Logger';
import path = require('path');

const logger = Logger.create('InteropService_Importer_OneNote');

export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	private getEntryDirectory(unzippedPath: string, entryName: string) {
		const withoutBasePath = entryName.replace(unzippedPath, '');
		return path.normalize(withoutBasePath).split(path.sep)[0];
	}

	public async exec(result: ImportExportResult) {
		const sourcePath = rtrimSlashes(this.sourcePath_);
		const unzipTempDirectory = await this.temporaryDirectory_(true);
		const zip = new AdmZip(sourcePath);
		logger.info('Unzipping files...');
		zip.extractAllTo(unzipTempDirectory, false);

		const files = zip.getEntries();
		if (files.length === 0) {
			result.warnings.push('Zip file has no files.');
			return result;
		}

		// files that don't have a name seems to be local only and shouldn't be processed

		const tempOutputDirectory = await this.temporaryDirectory_(true);
		const baseFolder = this.getEntryDirectory(unzipTempDirectory, files[0].entryName);
		const notebookBaseDir = path.join(unzipTempDirectory, baseFolder, path.sep);
		const outputDirectory2 = path.join(tempOutputDirectory, baseFolder);

		const notebookFiles = zip.getEntries().filter(e => e.name !== '.onetoc2' && e.name !== 'OneNote_RecycleBin.onetoc2');

		logger.info('Extracting OneNote to HTML');
		for (const notebookFile of notebookFiles) {
			const notebookFilePath = join(unzipTempDirectory, notebookFile.entryName);
			try {
				await oneNoteConverter(notebookFilePath, resolve(outputDirectory2), notebookBaseDir);
			} catch (error) {
				console.error(error);
			}
		}

		logger.info('Importing HTML into Joplin');
		const importer = new InteropService_Importer_Md();
		importer.setMetadata({ fileExtensions: ['html'] });
		await importer.init(tempOutputDirectory, {
			...this.options_,
			format: 'html',
			outputFormat: ImportModuleOutputFormat.Html,

		});
		logger.info('Finished');
		result = await importer.exec(result);

		// remover temp directories?
		return result;
	}
}
