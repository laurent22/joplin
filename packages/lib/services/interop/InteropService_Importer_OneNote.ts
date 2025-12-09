import { ImportExportResult, ImportModuleOutputFormat, ImportOptions } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import { join, resolve, normalize, sep, dirname, extname, basename } from 'path';
import Logger from '@joplin/utils/Logger';
import { uuidgen } from '../../uuid';
import shim from '../../shim';

const logger = Logger.create('InteropService_Importer_OneNote');

export type SvgXml = {
	title: string;
	content: string;
};

type ExtractSvgsReturn = {
	svgs: SvgXml[];
	html: string;
};

// See onenote-converter README.md for more information
export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};
	private domParser: DOMParser = null;
	private xmlSerializer: XMLSerializer = null;

	public async init(sourcePath: string, options: ImportOptions) {
		await super.init(sourcePath, options);
		if (!options.domParser || !options.xmlSerializer) {
			throw new Error('OneNote importer requires DOMParser and XMLSerializer to be able to extract SVG from HTML.');
		}
		this.domParser = options.domParser;
		this.xmlSerializer = options.xmlSerializer;
	}

	private getEntryDirectory(unzippedPath: string, entryName: string) {
		const withoutBasePath = entryName.replace(unzippedPath, '');
		return normalize(withoutBasePath).split(sep)[0];
	}

	private async extractFiles_(sourcePath: string, targetPath: string) {
		const fileExtension = extname(sourcePath).toLowerCase();
		const fileNameNoExtension = basename(sourcePath, extname(sourcePath));
		if (fileExtension === '.zip') {
			logger.info('Unzipping files...');
			await shim.fsDriver().zipExtract({ source: sourcePath, extractTo: targetPath });
		} else if (fileExtension === '.one') {
			logger.info('Copying file...');

			const outputDirectory = join(targetPath, fileNameNoExtension);
			await shim.fsDriver().mkdir(outputDirectory);

			await shim.fsDriver().copy(sourcePath, join(outputDirectory, basename(sourcePath)));
		} else if (fileExtension === '.onepkg') {
			// Change the file extension so that the archive can be extracted
			const archivePath = join(targetPath, `${fileNameNoExtension}.cab`);
			await shim.fsDriver().copy(sourcePath, archivePath);

			const extractPath = join(targetPath, fileNameNoExtension);
			await shim.fsDriver().mkdir(extractPath);

			await shim.fsDriver().cabExtract({
				source: archivePath,
				extractTo: extractPath,
				// Only the .one files are used--there's no need to extract
				// other files.
				fileNamePattern: '*.one',
			});
		} else {
			throw new Error(`Unknown file extension: ${fileExtension}`);
		}
		return await shim.fsDriver().readDirStats(targetPath, { recursive: true });
	}

	private async execImpl_(result: ImportExportResult, unzipTempDirectory: string, tempOutputDirectory: string) {
		const sourcePath = rtrimSlashes(this.sourcePath_);
		const files = await this.extractFiles_(sourcePath, unzipTempDirectory);

		if (files.length === 0) {
			result.warnings.push('Zip file has no files.');
			return result;
		}

		const baseFolder = this.getEntryDirectory(unzipTempDirectory, files[0].path);
		const notebookBaseDir = join(unzipTempDirectory, baseFolder, sep);
		const outputDirectory2 = join(tempOutputDirectory, baseFolder);

		const notebookFiles = files.filter(e => {
			return extname(e.path) !== '.onetoc2' && basename(e.path) !== 'OneNote_RecycleBin.onetoc2';
		});
		const { oneNoteConverter } = shim.requireDynamic('@joplin/onenote-converter');

		logger.info('Extracting OneNote to HTML');
		const skippedFiles = [];
		for (const notebookFile of notebookFiles) {
			const notebookFilePath = join(unzipTempDirectory, notebookFile.path);
			// In some cases, the OneNote zip file can include folders and other files
			// that shouldn't be imported directly. Skip these:
			if (!['.one', '.onetoc2'].includes(extname(notebookFilePath).toLowerCase())) {
				logger.info('Skipping non-OneNote file:', notebookFile.path);
				skippedFiles.push(notebookFile.path);
				continue;
			}

			try {
				await oneNoteConverter(notebookFilePath, resolve(outputDirectory2), notebookBaseDir);
			} catch (error) {
				this.options_.onError?.(error);
				console.error(error);
			}
		}

		if (skippedFiles.length === notebookFiles.length) {
			this.options_.onError?.(new Error(`None of the files appear to be from OneNote. Skipped files include: ${JSON.stringify(skippedFiles)}`));
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

	public async exec(result: ImportExportResult) {
		const unzipTempDirectory = await this.temporaryDirectory_(true);
		const tempOutputDirectory = await this.temporaryDirectory_(true);
		try {
			return await this.execImpl_(result, unzipTempDirectory, tempOutputDirectory);
		} finally {
			await shim.fsDriver().remove(unzipTempDirectory);
			await shim.fsDriver().remove(tempOutputDirectory);
		}
	}

	private async moveSvgToLocalFile(baseFolder: string) {
		const htmlFiles = await this.getValidHtmlFiles(resolve(baseFolder));

		for (const file of htmlFiles) {
			const fileLocation = join(baseFolder, file.path);
			const originalHtml = await shim.fsDriver().readFile(fileLocation);
			const { svgs, html: updatedHtml } = this.extractSvgs(originalHtml, () => uuidgen(10));

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

	public extractSvgs(html: string, titleGenerator: ()=> string): ExtractSvgsReturn {
		const dom = this.domParser.parseFromString(html, 'text/html');

		// get all "top-level" SVGS (ignore nested)
		const svgNodeList = dom.querySelectorAll('svg');

		if (!svgNodeList || !svgNodeList.length) {
			return { svgs: [], html };
		}

		const svgs: SvgXml[] = [];

		for (const svgNode of svgNodeList) {
			const img = dom.createElement('img');

			if (svgNode.hasAttribute('style')) {
				img.setAttribute('style', svgNode.getAttribute('style'));
				svgNode.removeAttribute('style');
			}

			for (const entry of svgNode.classList) {
				img.classList.add(entry);
			}

			if (svgNode.hasAttribute('style')) {
				img.setAttribute('style', svgNode.getAttribute('style'));
				svgNode.removeAttribute('style');
			}

			// A11Y: Translate SVG titles to ALT text
			// See https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/title
			const titleElement = svgNode.querySelector('title');
			if (titleElement) {
				img.alt = titleElement.textContent;
			}

			const title = `${titleGenerator()}.svg`;
			img.setAttribute('src', `./${title}`);

			svgs.push({
				title,
				content: this.xmlSerializer.serializeToString(svgNode),
			});

			svgNode.replaceWith(img);
		}

		return {
			svgs,
			// Don't use xmlSerializer here: It breaks <style> blocks.
			html: `<!DOCTYPE HTML>\n${dom.documentElement.outerHTML}`,
		};
	}
}
