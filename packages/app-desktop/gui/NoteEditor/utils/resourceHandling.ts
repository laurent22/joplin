import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import htmlUtils from '@joplin/lib/htmlUtils';
import rendererHtmlUtils, { extractHtmlBody, removeWrappingParagraphAndTrailingEmptyElements } from '@joplin/renderer/htmlUtils';
import Logger from '@joplin/utils/Logger';
import { fileUriToPath } from '@joplin/utils/url';
import { MarkupLanguage } from '@joplin/renderer';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from './types';
import markupRenderOptions from './markupRenderOptions';
import { fileExtension, filename, safeFileExtension, safeFilename } from '@joplin/utils/path';
const joplinRendererUtils = require('@joplin/renderer').utils;
const { clipboard } = require('electron');
import * as mimeUtils from '@joplin/lib/mime-utils';
import bridge from '../../../services/bridge';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';
const md5 = require('md5');
const path = require('path');

const logger = Logger.create('resourceHandling');

export async function handleResourceDownloadMode(noteBody: string) {
	if (noteBody && Setting.value('sync.resourceDownloadMode') === 'auto') {
		const resourceIds = await Note.linkedResourceIds(noteBody);
		await ResourceFetcher.instance().markForDownload(resourceIds);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function commandAttachFileToBody(body: string, filePaths: string[] = null, options: any = null) {
	options = {
		createFileURL: false,
		position: 0,
		markupLanguage: MarkupLanguage.Markdown,
		...options,
	};

	if (!filePaths) {
		filePaths = await bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return null;
	}

	const collatorLocale = getCollatorLocale();
	const collator = getCollator(collatorLocale);
	filePaths = filePaths.sort((a, b) => {
		return collator.compare(a, b);
	});

	let pos = options.position ?? 0;

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		const beforeLen = body.length;
		try {
			logger.info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, pos, {
				createFileURL: options.createFileURL,
				resizeLargeImages: Setting.value('imageResizing'),
				markupLanguage: options.markupLanguage,
				resourcePrefix: i > 0 ? ' ' : '',
			});
			if (!newBody) {
				logger.info('File attachment was cancelled');
				return null;
			}
			pos += newBody.length - beforeLen;
			body = newBody;
			logger.info('File was attached.');
		} catch (error) {
			logger.error(error);
			bridge().showErrorMessageBox(error.message);
		}
	}
	return body;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function resourcesStatus(resourceInfos: any) {
	let lowestIndex = joplinRendererUtils.resourceStatusIndex('ready');
	for (const id in resourceInfos) {
		const s = joplinRendererUtils.resourceStatus(Resource, resourceInfos[id]);
		const idx = joplinRendererUtils.resourceStatusIndex(s);
		if (idx < lowestIndex) lowestIndex = idx;
	}
	return joplinRendererUtils.resourceStatusName(lowestIndex);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const clipboardImageToResource = async (image: any, mime: string) => {
	const fileExt = mimeUtils.toFileExtension(mime);
	const filePath = `${Setting.value('tempDir')}/${md5(Date.now())}.${fileExt}`;
	await shim.writeImageToFile(image, mime, filePath);
	try {
		const md = await commandAttachFileToBody('', [filePath]);
		return md;
	} finally {
		await shim.fsDriver().remove(filePath);
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function getResourcesFromPasteEvent(event: any) {
	const output = [];
	const formats = clipboard.availableFormats();
	for (let i = 0; i < formats.length; i++) {
		const format = formats[i].toLowerCase();
		const formatType = format.split('/')[0];

		if (formatType === 'image') {
			// writeImageToFile can process only image/jpeg, image/jpg or image/png mime types
			if (['image/png', 'image/jpg', 'image/jpeg'].indexOf(format) < 0) {
				continue;
			}
			if (event) event.preventDefault();
			const md = await clipboardImageToResource(clipboard.readImage(), format);
			if (md) output.push(md);
		}
	}

	// Some applications (e.g. macshot) copy images to the clipboard without
	// an image/* format, but clipboard.readImage() can still read them.
	if (!output.length) {
		const image = clipboard.readImage();
		if (!image.isEmpty()) {
			if (event) event.preventDefault();
			const md = await clipboardImageToResource(image, 'image/png');
			if (md) output.push(md);
		}
	}

	return output;
}


export interface ProcessImagesOptions {
	// When true, returns Joplin internal URLs (:/resourceId) instead of file:// URLs
	useInternalUrls?: boolean;
}

export const processImagesInPastedHtml = async (html: string, options: ProcessImagesOptions = {}) => {
	const allImageUrls: string[] = [];
	const mappedResources: Record<string, string> = {};

	const resourceUrl = (resource: ResourceEntity) => {
		return options.useInternalUrls
			? Resource.internalUrl(resource)
			: `file://${encodeURI(Resource.fullPath(resource))}`;
	};

	htmlUtils.replaceImageUrls(html, (src: string) => {
		allImageUrls.push(src);
	});

	const downloadImage = async (imageSrc: string) => {
		try {
			const fileExt = safeFileExtension(fileExtension(imageSrc));
			const name = safeFilename(filename(imageSrc));
			const pieces = [name ? name : md5(Date.now() + Math.random())];
			if (fileExt) pieces.push(fileExt);
			const filePath = `${Setting.value('tempDir')}/${pieces.join('.')}`;
			await shim.fetchBlob(imageSrc, { path: filePath });
			const createdResource = await shim.createResourceFromPath(filePath);
			await shim.fsDriver().remove(filePath);
			mappedResources[imageSrc] = resourceUrl(createdResource);
		} catch (error) {
			logger.warn(`Error creating a resource for ${imageSrc}.`, error);
			mappedResources[imageSrc] = imageSrc;
		}
	};

	const downloadImages: Promise<void>[] = [];

	for (const imageSrc of allImageUrls) {
		if (!mappedResources[imageSrc]) {
			logger.info(`processPastedHtml: Processing image ${imageSrc}`);
			try {
				if (imageSrc.startsWith('file')) {
					const imageFilePath = path.normalize(fileUriToPath(imageSrc));
					const resourceDirPath = path.normalize(Setting.value('resourceDir'));

					// Use path.relative for robust containment check - startsWith can falsely match sibling paths
					const rel = path.relative(resourceDirPath, imageFilePath);
					const isInsideResourceDir = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
					if (isInsideResourceDir) {
						if (options.useInternalUrls) {
							const resourceId = Resource.pathToId(imageFilePath);
							mappedResources[imageSrc] = `:/${resourceId}`;
						} else {
							mappedResources[imageSrc] = imageSrc;
						}
					} else {
						const createdResource = await shim.createResourceFromPath(imageFilePath);
						mappedResources[imageSrc] = resourceUrl(createdResource);
					}
				} else if (imageSrc.startsWith('data:')) {
					// Word encodes base64 with MIME line breaks every ~76 chars.
					// Strip whitespace before decoding, then save as a Joplin resource
					// so Turndown's outerHTML (used for images with width/height) gets
					// a short URL instead of 200KB of base64.
					const cleanSrc = imageSrc.replace(/\s/g, '');
					const dataUrlMatch = cleanSrc.match(/^data:((?!image\/svg\+xml)[^;]+);base64,(.+)$/);
					if (dataUrlMatch) {
						const mimeType = dataUrlMatch[1];
						const base64Data = dataUrlMatch[2];
						const fileExt = mimeUtils.toFileExtension(mimeType) || 'bin';
						const filePath = `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.${fileExt}`;
						try {
							await shim.fsDriver().writeFile(filePath, base64Data, 'base64');
							const createdResource = await shim.createResourceFromPath(filePath);
							mappedResources[imageSrc] = resourceUrl(createdResource);
						} catch (writeError) {
							writeError.message = `processPastedHtml: Failed to write or create resource from pasted image: ${writeError.message}`;
							throw writeError;
						} finally {
							try {
								await shim.fsDriver().remove(filePath);
							} catch (cleanupError) {
								logger.warn('processPastedHtml: Error removing temporary file.', cleanupError);
							}
						}
					} else {
						mappedResources[imageSrc] = imageSrc;
					}
				} else {
					downloadImages.push(downloadImage(imageSrc));
				}
			} catch (error) {
				logger.warn(`processPastedHtml: Error creating a resource for ${imageSrc}.`, error);
				mappedResources[imageSrc] = imageSrc;
			}
		}
	}

	await Promise.all(downloadImages);

	return htmlUtils.replaceImageUrls(html, (src: string) => mappedResources[src]);
};

export async function processPastedHtml(html: string, htmlToMd: HtmlToMarkdownHandler | null, mdToHtml: MarkupToHtmlHandler | null) {
	// When copying text from eg. GitHub, the HTML might contain non-breaking
	// spaces instead of regular spaces. If these non-breaking spaces are
	// inserted into the TinyMCE editor (using insertContent), they will be
	// dropped. So here we convert them to regular spaces.
	// https://stackoverflow.com/a/31790544/561309
	html = html.replace(/[\u202F\u00A0]/g, ' ');

	html = await processImagesInPastedHtml(html);

	// Word encodes newlines in alt attributes as HTML entities (&#10; &#13; &#xA; etc.).
	// These get decoded to literal newline characters by JSDOM when Turndown processes
	// the HTML. With preserveImageTagsWithSize=true, Turndown returns node.outerHTML
	// verbatim — embedding literal newlines inside an HTML attribute value, which
	// breaks the Markdown raw HTML block (a blank line ends the block, making the
	// parser treat the <img> as plain text). Normalize them to spaces here.
	html = html.replace(
		/(\balt\s*=\s*)(["'])([\s\S]*?)\2/gi,
		(_m, prefix, quote, altText) => {
			// Replace HTML-encoded newlines/control chars and literal ones with a space
			const normalized = altText
				.replace(/&#(?:10|13);|&#x(?:0*[aAdD]);/gi, ' ')
				// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional sanitisation of control chars
				// eslint-disable-next-line no-control-regex
				.replace(/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
				.replace(/ {2,}/g, ' ')
				.trim();
			return `${prefix}${quote}${normalized}${quote}`;
		},
	);

	// TinyMCE can accept any type of HTML, including HTML that may not be preserved once saved as
	// Markdown. For example the content may have a dark background which would be supported by
	// TinyMCE, but lost once the note is saved. So here we convert the HTML to Markdown then back
	// to HTML to ensure that the content we paste will be handled correctly by the app.
	if (htmlToMd && mdToHtml) {
		const md = await htmlToMd(MarkupLanguage.Markdown, html, '', { preserveColorStyles: Setting.value('editor.pastePreserveColors') });
		html = (await mdToHtml(MarkupLanguage.Markdown, md, markupRenderOptions({ bodyOnly: true }))).html;

		// When plugins that add to the end of rendered content are installed, bodyOnly can
		// fail to remove the wrapping paragraph. This works around that issue by removing
		// the wrapping paragraph in more cases. See issue #10061.
		if (!md.trim().includes('\n')) {
			html = removeWrappingParagraphAndTrailingEmptyElements(html);
		}
	}

	return extractHtmlBody(rendererHtmlUtils.sanitizeHtml(html, {
		allowedFilePrefixes: [Setting.value('resourceDir')],
	}));
}
