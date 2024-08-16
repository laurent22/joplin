import { ImportExportResult, ImportModuleOutputFormat } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import * as AdmZip from 'adm-zip';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import { join, resolve, normalize, sep, dirname } from 'path';
import Logger from '@joplin/utils/Logger';
import { SvgXml, extractSvgs } from '@joplin/utils/html';
import { uuidgen } from '../../uuid';
import shim from '../../shim';

const logger = Logger.create('InteropService_Importer_OneNote');

export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	private getEntryDirectory(unzippedPath: string, entryName: string) {
		const withoutBasePath = entryName.replace(unzippedPath, '');
		return normalize(withoutBasePath).split(sep)[0];
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

		const tempOutputDirectory = await this.temporaryDirectory_(true);
		const baseFolder = this.getEntryDirectory(unzipTempDirectory, files[0].entryName);
		const notebookBaseDir = join(unzipTempDirectory, baseFolder, sep);
		const outputDirectory2 = join(tempOutputDirectory, baseFolder);

		const notebookFiles = zip.getEntries().filter(e => e.name !== '.onetoc2' && e.name !== 'OneNote_RecycleBin.onetoc2');
		const { oneNoteConverter } = shim.requireDynamic('../../../onenote-converter/pkg/onenote_converter');

		logger.info('Extracting OneNote to HTML');
		for (const notebookFile of notebookFiles) {
			const notebookFilePath = join(unzipTempDirectory, notebookFile.entryName);
			try {
				await oneNoteConverter(notebookFilePath, resolve(outputDirectory2), notebookBaseDir);
			} catch (error) {
				console.error(error);
			}
		}

		logger.info('Extracting SVGs into files');
		await this.moveSvgToLocalFile(tempOutputDirectory);

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

		return result;
	}

	private async moveSvgToLocalFile(baseFolder: string) {
		const htmlFiles = await this.getValidHtmlFiles(resolve(baseFolder));

		for (const file of htmlFiles) {
			const fileLocation = join(baseFolder, file.path);
			const originalHtml = await shim.fsDriver().readFile(fileLocation);
			const { svgs, html: updatedHtml } = await extractSvgs(originalHtml, () => uuidgen(10));

			if (!svgs || !svgs.length) continue;

			await shim.fsDriver().writeFile(fileLocation, updatedHtml, 'utf8');
			await this.createSvgFiles(svgs, join(baseFolder, dirname(file.path)));
		}
	}

	private async getValidHtmlFiles(baseFolder: string) {
		const files = await shim.fsDriver().readDirStats(baseFolder, { recursive: true });
		const htmlFiles = files.filter(f => !f.isDirectory() && f.path.endsWith('.html'));
		return htmlFiles;
	}

	private async createSvgFiles(svgs: SvgXml[], svgBaseFolder: string) {
		for (const svg of svgs) {
			await shim.fsDriver().writeFile(join(svgBaseFolder, svg.title), svg.content, 'utf8');
		}
	}
}
