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

// cspell:ignore oxps Pbgra

const logger = Logger.create('InteropService_Importer_OneNote');

const xpsPrintoutImageExtensions = ['.xps', '.oxps'];
const xpsPrintoutPageNumberAttributes = [
	'data-onenote-page-number',
	'data-joplin-onenote-page-number',
];

const xpsToPngPowerShellScript = String.raw`
$ErrorActionPreference = 'Stop'

$assemblies = @(
	'PresentationCore',
	'PresentationFramework',
	'ReachFramework',
	'System.Xaml',
	'WindowsBase'
)

foreach ($assembly in $assemblies) {
	Add-Type -AssemblyName $assembly
}

Add-Type -ReferencedAssemblies $assemblies -TypeDefinition @"
using System;
using System.IO;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Xps.Packaging;

namespace Joplin {
	public static class XpsConverter {
		public static void RenderPage(string inputPath, string outputPath, int pageNumber, double scale) {
			if (String.IsNullOrEmpty(inputPath)) {
				throw new ArgumentException("Missing input path.", "inputPath");
			}

			if (String.IsNullOrEmpty(outputPath)) {
				throw new ArgumentException("Missing output path.", "outputPath");
			}

			if (pageNumber < 1) {
				throw new ArgumentOutOfRangeException("pageNumber");
			}

			using (XpsDocument document = new XpsDocument(inputPath, FileAccess.Read)) {
				FixedDocumentSequence sequence = document.GetFixedDocumentSequence();
				DocumentPaginator paginator = sequence.DocumentPaginator;
				paginator.ComputePageCount();

				int pageIndex = pageNumber - 1;
				if (pageIndex >= paginator.PageCount) {
					throw new ArgumentOutOfRangeException("pageNumber");
				}

				DocumentPage page = paginator.GetPage(pageIndex);
				try {
					Size pageSize = page.Size;
					int pixelWidth = Math.Max(1, (int)Math.Ceiling(pageSize.Width * scale));
					int pixelHeight = Math.Max(1, (int)Math.Ceiling(pageSize.Height * scale));

					DrawingVisual visual = new DrawingVisual();
					using (DrawingContext context = visual.RenderOpen()) {
						context.DrawRectangle(Brushes.White, null, new Rect(new Point(0, 0), pageSize));
						context.PushTransform(new ScaleTransform(scale, scale));
						context.DrawRectangle(new VisualBrush(page.Visual), null, new Rect(new Point(0, 0), pageSize));
						context.Pop();
					}

					RenderTargetBitmap bitmap = new RenderTargetBitmap(pixelWidth, pixelHeight, 96, 96, PixelFormats.Pbgra32);
					bitmap.Render(visual);

					PngBitmapEncoder encoder = new PngBitmapEncoder();
					encoder.Frames.Add(BitmapFrame.Create(bitmap));

					using (FileStream stream = new FileStream(outputPath, FileMode.Create, FileAccess.Write)) {
						encoder.Save(stream);
					}
				} finally {
					page.Dispose();
				}
			}
		}
	}
}
"@

[Joplin.XpsConverter]::RenderPage($env:JOPLIN_XPS_INPUT, $env:JOPLIN_XPS_OUTPUT, [int]$env:JOPLIN_XPS_PAGE_NUMBER, 2.0)
`;

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
		await this.postprocessGeneratedHtmlInFolder_(tempOutputDirectory);

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

		for (const file of htmlFiles) {
			const fileLocation = join(baseFolder, file.path);
			const originalHtml = await shim.fsDriver().readFile(fileLocation);
			const { changed, html } = await this.postprocessGeneratedHtml_(originalHtml, dirname(fileLocation), idMap);

			if (changed) {
				await shim.fsDriver().writeFile(fileLocation, html, 'utf-8');
			}
		}
	}

	// Public to allow testing
	public async postprocessGeneratedHtml_(html: string, baseFolder: string, idMap: PageIdMap) {
		const pipeline = [
			(dom: Document, currentFolder: string) => this.extractSvgsToFiles_(dom, currentFolder),
			(dom: Document, currentFolder: string) => this.convertXpsPrintoutsToImages_(dom, currentFolder),
			(dom: Document, currentFolder: string) => this.convertExternalLinksToInternalLinks_(dom, currentFolder, idMap),
			(dom: Document, _currentFolder: string) => Promise.resolve(this.simplifyHtml_(dom)),
		];
		// Workaround: HTML read directly from the filesystem can cause parseFromString to hang.
		// Force creation of a new string.
		// See https://github.com/laurent22/joplin/issues/15132
		html = `${html} `.substring(0, html.length);
		const dom = this.domParser.parseFromString(html, 'text/html');

		let changed = false;
		for (const task of pipeline) {
			const result = await task(dom, baseFolder);
			changed ||= result;
		}

		if (changed) {
			// Don't use xmlSerializer here: It breaks <style> blocks.
			html = `<!DOCTYPE HTML>\n${dom.documentElement.outerHTML}`;
		}

		return { changed, html };
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

	private isXpsPrintoutImage_(image: HTMLImageElement) {
		const src = image.getAttribute('src') ?? '';
		return xpsPrintoutImageExtensions.includes(extname(src).toLowerCase());
	}

	private safeDecodeFileSrc_(src: string) {
		try {
			return decodeURIComponent(src);
		} catch (error) {
			logger.warn('Failed to decode OneNote image path:', src, error);
			return src;
		}
	}

	private xpsPrintoutOutputFilename_(sourcePath: string, pageNumber: number) {
		const extension = extname(sourcePath);
		return `${basename(sourcePath, extension)}.page-${pageNumber}.png`;
	}

	private xpsPrintoutDisplayedPageNumber_(image: HTMLImageElement) {
		const pageNumberAttribute = xpsPrintoutPageNumberAttributes.find(attribute => image.hasAttribute(attribute));
		const parsedPageNumber = Number.parseInt(pageNumberAttribute ? image.getAttribute(pageNumberAttribute) : '', 10);
		return Number.isFinite(parsedPageNumber) && parsedPageNumber >= 0 ? parsedPageNumber : null;
	}

	private removeXpsPrintoutPageNumberAttributes_(image: HTMLImageElement) {
		for (const attribute of xpsPrintoutPageNumberAttributes) {
			image.removeAttribute(attribute);
		}
	}

	private replaceXpsPrintoutImageWithLink_(dom: Document, image: HTMLImageElement) {
		const src = image.getAttribute('src') ?? '';
		const displayedPageNumber = this.xpsPrintoutDisplayedPageNumber_(image);
		const link = dom.createElement('a');
		const style = image.getAttribute('style');

		link.setAttribute('href', src);
		if (style) link.setAttribute('style', style);
		link.textContent = displayedPageNumber === null
			? 'XPS printout: Open original XPS file'
			: `XPS printout page ${displayedPageNumber}: Open original XPS file`;

		image.replaceWith(link);
	}

	private async convertXpsPrintoutPageToImage_(sourcePath: string, outputPath: string, pageNumber: number) {
		if (await shim.fsDriver().exists(outputPath)) return;

		const { spawn } = shim.requireDynamic('child_process') as typeof import('child_process');

		await new Promise<void>((resolve, reject) => {
			const processEnv = {
				...process.env,
				JOPLIN_XPS_INPUT: sourcePath,
				JOPLIN_XPS_OUTPUT: outputPath,
				JOPLIN_XPS_PAGE_NUMBER: `${pageNumber}`,
			};

			const childProcess = spawn('PowerShell.exe', [
				'-NoProfile',
				'-NonInteractive',
				'-ExecutionPolicy',
				'Bypass',
				'-Sta',
				'-Command',
				'-',
			], {
				env: processEnv,
				windowsHide: true,
			});

			let stderr = '';
			let stdout = '';

			childProcess.stderr.on('data', data => {
				stderr += data.toString();
			});
			childProcess.stdout.on('data', data => {
				stdout += data.toString();
			});
			childProcess.on('error', error => {
				reject(error);
			});
			childProcess.on('close', code => {
				if (code === 0) {
					resolve();
				} else {
					const output = (stderr || stdout).trim();
					reject(new Error(`PowerShell.exe exited with code ${code}.${output ? ` Output: ${output}` : ''}`));
				}
			});

			childProcess.stdin.end(xpsToPngPowerShellScript);
		});
	}

	private async convertXpsPrintoutsToImages_(dom: Document, baseFolder: string) {
		const images = Array.from(dom.querySelectorAll<HTMLImageElement>('img[src]')).filter(image => this.isXpsPrintoutImage_(image));
		if (!images.length) return false;

		if (!shim.isWindows()) {
			for (const image of images) {
				this.replaceXpsPrintoutImageWithLink_(dom, image);
			}
			return true;
		}

		const conversions = new Map<string, Promise<string|null>>();
		let changed = false;

		for (const image of images) {
			const src = image.getAttribute('src') ?? '';
			const displayedPageNumber = this.xpsPrintoutDisplayedPageNumber_(image);
			const pageNumber = displayedPageNumber === null ? 1 : displayedPageNumber + 1;
			const sourcePath = resolve(baseFolder, this.safeDecodeFileSrc_(src));
			const outputPath = join(dirname(sourcePath), this.xpsPrintoutOutputFilename_(sourcePath, pageNumber));
			const conversionKey = `${sourcePath}:${pageNumber}`;

			if (!conversions.has(conversionKey)) {
				conversions.set(conversionKey, (async () => {
					try {
						await this.convertXpsPrintoutPageToImage_(sourcePath, outputPath, pageNumber);
						return outputPath;
					} catch (error) {
						logger.warn('Failed to convert OneNote XPS printout page:', sourcePath, pageNumber, error);
						return null;
					}
				})());
			}

			const convertedPath = await conversions.get(conversionKey);
			if (convertedPath) {
				image.setAttribute('src', relative(baseFolder, convertedPath).split(sep).join('/'));
				this.removeXpsPrintoutPageNumberAttributes_(image);
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
