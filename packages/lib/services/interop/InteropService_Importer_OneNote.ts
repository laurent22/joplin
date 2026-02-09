import { ImportExportResult, ImportModuleOutputFormat, ImportOptions } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import { join, resolve, normalize, sep, dirname, extname, basename, relative } from 'path';
import Logger from '@joplin/utils/Logger';
import { uuidgen } from '../../uuid';
import shim from '../../shim';

const logger = Logger.create('InteropService_Importer_OneNote');

export type SvgXml = {
	title: string;
	content: string;
};

type PageResolutionResult = { path: string };
type PageIdMap = {
	get: (pageId: string)=> PageResolutionResult|null;
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
		} else if (fileExtension === '.one' || fileExtension === '.onepkg') {
			logger.info('Copying file...');

			const outputDirectory = join(targetPath, fileNameNoExtension);
			await shim.fsDriver().mkdir(outputDirectory);

			await shim.fsDriver().copy(sourcePath, join(outputDirectory, basename(sourcePath)));
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
			if (!['.one', '.onepkg', '.onetoc2'].includes(extname(notebookFilePath).toLowerCase())) {
				logger.info('Skipping non-OneNote file:', notebookFile.path);
				skippedFiles.push(notebookFile.path);
				continue;
			}

			try {
				await oneNoteConverter(notebookFilePath, resolve(outputDirectory2), notebookBaseDir);
			} catch (error) {
				// Forward only the error message. Usually the stack trace points to bytes in the WASM file.
				// It's very difficult to use and can cause the error report to be longer than the maximum
				// length for auto-creating a forum post:
				this.options_.onError?.(error.message ?? error);
				console.error(error);
			}
		}

		if (skippedFiles.length === notebookFiles.length) {
			this.options_.onError?.(new Error(`None of the files appear to be from OneNote. Skipped files include: ${JSON.stringify(skippedFiles)}`));
		}

		logger.info('Postprocessing imported content...');
		await this.postprocessGeneratedHtml_(tempOutputDirectory);

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

	private async buildIdMap_(baseFolder: string): Promise<PageIdMap> {
		const htmlFiles = await this.getValidHtmlFiles_(resolve(baseFolder));
		const pageIdToPath = new Map<string, string>();

		for (const file of htmlFiles) {
			const fullPath = join(baseFolder, file.path);
			const html: string = await shim.fsDriver().readFile(fullPath);

			const metaTagMatch = html.match(/<meta name="X-Original-Page-Id" content="([^"]+)"/i);
			if (metaTagMatch) {
				const pageId = metaTagMatch[1];
				pageIdToPath.set(pageId.toUpperCase(), fullPath);
			}
		}

		return {
			get: (id: string)=>{
				const path = pageIdToPath.get(id.toUpperCase());

				if (path) {
					return { path };
				}
				return null;
			},
		};
	}

	private async postprocessGeneratedHtml_(baseFolder: string) {
		const htmlFiles = await this.getValidHtmlFiles_(resolve(baseFolder));

		const pipeline = [
			(dom: Document, currentFolder: string) => this.extractSvgsToFiles_(dom, currentFolder),
			(dom: Document, currentFolder: string) => this.convertExternalLinksToInternalLinks_(dom, currentFolder),
			(dom: Document, _currentFolder: string) => Promise.resolve(this.simplifyHtml_(dom)),
		];

		for (const file of htmlFiles) {
			const fileLocation = join(baseFolder, file.path);
			const originalHtml = await shim.fsDriver().readFile(fileLocation);
			const dom = this.domParser.parseFromString(originalHtml, 'text/html');

			let changed = false;
			for (const task of pipeline) {
				const result = await task(dom, dirname(fileLocation));
				changed ||= result;
			}

			if (changed) {
				// Don't use xmlSerializer here: It breaks <style> blocks.
				const updatedHtml = `<!DOCTYPE HTML>\n${dom.documentElement.outerHTML}`;
				await shim.fsDriver().writeFile(fileLocation, updatedHtml, 'utf-8');
			}
		}
	}

	private async getValidHtmlFiles_(baseFolder: string) {
		const files = await shim.fsDriver().readDirStats(baseFolder, { recursive: true });
		const htmlFiles = files.filter(f => !f.isDirectory() && f.path.endsWith('.html'));
		return htmlFiles;
	}

	private async convertExternalLinksToInternalLinks_(dom: Document, baseFolder: string) {
		let idMap_: PageIdMap|null = null;
		const idMap = async () => {
			idMap_ ??= await this.buildIdMap_(baseFolder);
			return idMap_;
		};

		const links = dom.querySelectorAll<HTMLAnchorElement>('a[href^="onenote"]');
		let changed = false;
		for (const link of links) {
			if (!link.href.startsWith('onenote:')) continue;

			// Remove everything before the first query parameter (e.g. &section-id=).
			const separatorIndex = link.href.indexOf('&');
			const prefixRemoved = link.href.substring(separatorIndex);
			const params = new URLSearchParams(prefixRemoved);
			const pageId = params.get('page-id');
			const targetPage = (await idMap()).get(pageId);

			// The target page might be in a different notebook (imported separately)
			if (!targetPage) {
				logger.info('Page not found for internal link. Page ID: ', pageId);
			} else {
				changed = true;
				link.href = relative(baseFolder, targetPage.path);
			}
		}
		return changed;
	}

	private simplifyHtml_(dom: Document) {
		const selectors = [
			// <script> blocks that aren't marked with a specific type (e.g. application/tex).
			'script:not([type])',
			// ID mappings (unused at this stage of the import process)
			'meta[name="X-Original-Page-Id"]',

			// Empty iframes
			'iframe[src=""]',
		];

		let changed = false;
		for (const selector of selectors) {
			for (const element of dom.querySelectorAll(selector)) {
				element.remove();
				changed = true;
			}
		}

		return changed;
	}

	private async extractSvgsToFiles_(dom: Document, svgBaseFolder: string) {
		const { svgs, changed } = this.extractSvgs(dom);

		for (const svg of svgs) {
			await shim.fsDriver().writeFile(join(svgBaseFolder, svg.title), svg.content, 'utf8');
		}

		return changed;
	}

	// Public to allow testing:
	public extractSvgs(dom: Document, titleGenerator: ()=> string = () => uuidgen(10)) {
		// get all "top-level" SVGS (ignore nested)
		const svgNodeList = dom.querySelectorAll('svg');

		if (!svgNodeList || !svgNodeList.length) {
			return { svgs: [], changed: false };
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
			changed: true,
		};
	}
}
