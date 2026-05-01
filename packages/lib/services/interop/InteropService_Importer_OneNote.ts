import { ImportExportResult, ImportModuleOutputFormat, ImportOptions } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import { join, resolve, normalize, sep, extname, basename, relative, dirname } from 'path';
import Logger from '@joplin/utils/Logger';
import { uuidgen } from '../../uuid';
import shim from '../../shim';
import { unique } from '../../ArrayUtils';
import Note from '../../models/Note';

const logger = Logger.create('InteropService_Importer_OneNote');

export type SvgXml = {
	title: string;
	content: string;
};

type PageResolutionResult = { path: string };
type PageIdMap = {
	get: (pageId: string|null)=> PageResolutionResult|null;
};

type NativeOneNoteConverter = (notebookPath: string, outputDirectory: string, baseDir: string)=> Promise<void>;
const getOneNoteConverter = (): NativeOneNoteConverter => {
	try {
		return shim.requireDynamic('@joplin/onenote-converter').oneNoteConverter;
	} catch (error) {
		// Log the original error for debugging:
		logger.warn('Failed to load the onenote importer:', error);

		// Throw a more user and maintainer-friendly error:
		throw new Error('Failed to load @joplin/onenote-converter. Please check that the onenote-converter package was built correctly and bundled with this version of Joplin.\n\nFor build instructions, see https://github.com/laurent22/joplin/blob/dev/packages/onenote-converter/README.md#building.');
	}
};

const setEnableUnresponsiveCheck = (enabled: boolean) => {
	if (shim.isElectron()) {
		shim.electronBridge().setEnableUnresponsiveCheck(enabled);
	}
};

interface NoteMetadata {
	created: Date;
	updated: Date;
	// Saving the title in the metadata allows using special characters not supported by the file
	// system in imported note titles (e.g. "/")
	title: string;
}

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

		const notebookFiles = files.filter(file =>
			['.one', '.onepkg', '.onetoc2'].includes(extname(file.path).toLowerCase()) &&
			basename(file.path) !== 'OneNote_RecycleBin.onetoc2',
		);

		const topLevelEntries = unique(notebookFiles.map(file => this.getEntryDirectory(unzipTempDirectory, file.path)));

		let baseFolder = '';
		for (const entry of topLevelEntries) {
			if (!entry) continue;
			const stat = await shim.fsDriver().stat(join(unzipTempDirectory, entry));
			if (stat?.isDirectory()) {
				if (baseFolder) {
					throw new Error(`OneNote zip contains files from multiple top-level directories: ${JSON.stringify(topLevelEntries)}`);
				}
				baseFolder = entry;
			}
		}

		const notebookBaseDir = !baseFolder ? join(unzipTempDirectory, sep) : join(unzipTempDirectory, baseFolder, sep);
		const outputDirectory2 = !baseFolder ? tempOutputDirectory : join(tempOutputDirectory, baseFolder);
		const oneNoteConverter = getOneNoteConverter();

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
				// HACK: The OneNote importer currently runs in the renderer process on desktop.
				// If importing a large file takes a long time, the "unresponsive" dialog can be
				// shown. Work around this by temporarily disabling the dialog:
				setEnableUnresponsiveCheck(false);

				await oneNoteConverter(notebookFilePath, resolve(outputDirectory2), notebookBaseDir);
			} catch (error) {
				// Forward only the error message. Usually the stack trace points to bytes in the WASM file.
				// It's very difficult to use and can cause the error report to be longer than the maximum
				// length for auto-creating a forum post:
				this.options_.onError?.(error.message ?? error);
				console.error(error);
			} finally {
				setEnableUnresponsiveCheck(true);
			}
		}

		if (skippedFiles.length === notebookFiles.length) {
			this.options_.onError?.(new Error(`None of the files appear to be from OneNote. Skipped files include: ${JSON.stringify(skippedFiles)}`));
		}

		logger.info('Postprocessing imported content...');
		const fileToMetadata = await this.postprocessGeneratedHtmlInFolder_(tempOutputDirectory);

		logger.info('Importing HTML into Joplin');
		const importer = new OneNoteHtmlImporter(fileToMetadata);
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
			get: (id: string|null) => {
				// Accepting null input matches the behavior of a JavaScript Map's .get method
				// and simplifies handling 'not found' edge cases:
				if (!id) return null;

				const path = pageIdToPath.get(id.toUpperCase());

				if (path) {
					return { path };
				}
				return null;
			},
		};
	}

	private async postprocessGeneratedHtmlInFolder_(baseFolder: string) {
		const htmlFiles = await this.getValidHtmlFiles_(resolve(baseFolder));
		const idMap = await this.buildIdMap_(baseFolder);
		const fileToMetadata = new Map<string, NoteMetadata>();

		for (const file of htmlFiles) {
			const fileLocation = join(baseFolder, file.path);
			const originalHtml = await shim.fsDriver().readFile(fileLocation);
			const { changed, html, metadata } = await this.postprocessGeneratedHtml_(originalHtml, dirname(fileLocation), idMap);

			if (changed) {
				await shim.fsDriver().writeFile(fileLocation, html, 'utf-8');
			}

			fileToMetadata.set(resolve(fileLocation), metadata);
		}

		return fileToMetadata;
	}

	// Public to allow testing
	public async postprocessGeneratedHtml_(html: string, baseFolder: string, idMap: PageIdMap) {
		const pipeline = [
			(dom: Document, currentFolder: string) => this.extractSvgsToFiles_(dom, currentFolder),
			(dom: Document, currentFolder: string) => this.convertExternalLinksToInternalLinks_(dom, currentFolder, idMap),
			(dom: Document, _currentFolder: string) => Promise.resolve(this.simplifyHtml_(dom)),
		];
		// Workaround: HTML read directly from the filesystem can cause parseFromString to hang.
		// Force creation of a new string.
		// See https://github.com/laurent22/joplin/issues/15132
		html = `${html} `.substring(0, html.length);
		const dom = this.domParser.parseFromString(html, 'text/html');

		const parseMetadata = (dom: Document) => {
			const parseTimestampMeta = (selector: string) => {
				const element = dom.querySelector<HTMLMetaElement>(selector);
				// Not all files processed by the importer have timestamp metadata tags
				// (e.g. files that contain lists of pages). Fall back:
				if (!element) return new Date();

				const timeSeconds = Number(element.content);
				if (!isFinite(timeSeconds) || timeSeconds < 0) return new Date();

				return new Date(timeSeconds * 1000);
			};

			return {
				created: parseTimestampMeta('meta[name="X-Created-Time"]'),
				updated: parseTimestampMeta('meta[name="X-Updated-Time"]'),
				title: dom.title,
			};
		};

		// Parse metadata first, since the pipeline can adjust the HTML:
		const metadata = parseMetadata(dom);

		let changed = false;
		for (const task of pipeline) {
			const result = await task(dom, baseFolder);
			changed ||= result;
		}

		if (changed) {
			// Don't use xmlSerializer here: It breaks <style> blocks.
			html = `<!DOCTYPE HTML>\n${dom.documentElement.outerHTML}`;
		}

		return {
			changed,
			html,
			metadata,
		};
	}

	private async getValidHtmlFiles_(baseFolder: string) {
		const files = await shim.fsDriver().readDirStats(baseFolder, { recursive: true });
		const htmlFiles = files.filter(f => !f.isDirectory() && f.path.endsWith('.html'));
		return htmlFiles;
	}

	private async convertExternalLinksToInternalLinks_(dom: Document, baseFolder: string, idMap: PageIdMap) {
		const links = dom.querySelectorAll<HTMLAnchorElement>('a[href^="onenote"]');
		let changed = false;
		for (const link of links) {
			if (!link.href.startsWith('onenote:')) continue;

			// Remove everything before the first query parameter (e.g. &section-id=).
			const separatorIndex = link.href.indexOf('&');
			const prefixRemoved = link.href.substring(separatorIndex);
			const params = new URLSearchParams(prefixRemoved);
			const pageId = params.get('page-id');
			const targetPage = idMap.get(pageId);

			// The target page might be in a different notebook (imported separately)
			if (!targetPage) {
				logger.info('Page not found for internal link. Page ID: ', pageId, 'link:', JSON.stringify(link.href));
			} else {
				changed = true;
				link.href = relative(baseFolder, targetPage.path);
			}
		}
		return changed;
	}

	private simplifyHtml_(dom: Document) {
		const removeLeadingSpace = (element: Element) => {
			const sibling = element.previousSibling;
			if (sibling && sibling.nodeName === '#text' && sibling.textContent.trim() === '') {
				sibling.remove();
			}
		};

		const nodesToRemove = [
			// <script> blocks that aren't marked with a specific type (e.g. application/tex).
			{ selector: 'script:not([type])' },

			// ID mappings and other metadata (unused at this stage of the import process)
			// Remove leading space to avoid unnecessary blank lines in test snapshots
			{ selector: 'meta[name="X-Original-Page-Id"]', preprocess: removeLeadingSpace },
			{ selector: 'meta[name="X-Created-Time"]', preprocess: removeLeadingSpace },
			{ selector: 'meta[name="X-Updated-Time"]', preprocess: removeLeadingSpace },

			// Empty iframes
			{ selector: 'iframe[src=""]' },
		];

		let changed = false;
		for (const { selector, preprocess } of nodesToRemove) {
			for (const element of dom.querySelectorAll(selector)) {
				preprocess?.(element);
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

class OneNoteHtmlImporter extends InteropService_Importer_Md {
	public constructor(private noteMetadata_: Map<string, NoteMetadata>) {
		super();
	}

	public override async importFile(filePath: string, parentFolderId: string) {
		try {
			const resolvedPath = shim.fsDriver().resolve(filePath);
			const note = await super.importFile(filePath, parentFolderId);

			const metadata = this.noteMetadata_.get(resolvedPath);
			if (metadata) {
				const updatedNote = {
					...note,

					user_updated_time: metadata.updated.getTime(),
					user_created_time: metadata.created.getTime(),
					title: metadata.title || note.title,
				};

				const noteItem = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });

				this.importedNotes[resolvedPath] = noteItem;
				return noteItem;
			} else {
				return note;
			}
		} catch (error) {
			error.message = `On ${filePath}: ${error.message}`;
			throw error;
		}
	}
}
