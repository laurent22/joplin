import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import Resource from '@joplin/lib/models/Resource';
const bridge = require('@electron/remote').require('./bridge').default;
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

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			logger.info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, options.position, {
				createFileURL: options.createFileURL,
				resizeLargeImages: Setting.value('imageResizing'),
				markupLanguage: options.markupLanguage,
				resourceSuffix: i > 0 ? ' ' : '',
			});

			if (!newBody) {
				logger.info('File attachment was cancelled');
				return null;
			}

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
export async function getResourcesFromPasteEvent(event: any) {
	const output = [];
	const formats = clipboard.availableFormats();
	for (let i = 0; i < formats.length; i++) {
		const format = formats[i].toLowerCase();
		const formatType = format.split('/')[0];

		if (formatType === 'image') {
			if (event) event.preventDefault();

			const image = clipboard.readImage();

			const fileExt = mimeUtils.toFileExtension(format);
			const filePath = `${Setting.value('tempDir')}/${md5(Date.now())}.${fileExt}`;

			await shim.writeImageToFile(image, format, filePath);
			const md = await commandAttachFileToBody('', [filePath]);
			await shim.fsDriver().remove(filePath);

			if (md) output.push(md);
		}
	}
	return output;
}


const processImagesInPastedHtml = async (html: string) => {
	const allImageUrls: string[] = [];
	const mappedResources: Record<string, string> = {};

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
			mappedResources[imageSrc] = `file://${encodeURI(Resource.fullPath(createdResource))}`;
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

					if (imageFilePath.startsWith(resourceDirPath)) {
						mappedResources[imageSrc] = imageSrc;
					} else {
						const createdResource = await shim.createResourceFromPath(imageFilePath);
						mappedResources[imageSrc] = `file://${encodeURI(Resource.fullPath(createdResource))}`;
					}
				} else if (imageSrc.startsWith('data:')) {
					mappedResources[imageSrc] = imageSrc;
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
