import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import Resource from '@joplin/lib/models/Resource';
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

// Inline formatting tag names that, when empty, produce stray Markdown
// markers (e.g. ** from empty <b>).
const removableInlineTags = new Set(['b', 'strong', 'i', 'em', 'u', 's']);

// Block-level tags whose children should NOT be paragraph-normalized.
const blockTags = new Set([
	'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
	'blockquote', 'pre', 'hr', 'figure', 'figcaption', 'section',
]);

function hasVisibleText(node: Node): boolean {
	if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
	if (node.nodeType === Node.ELEMENT_NODE) {
		for (const child of Array.from(node.childNodes)) {
			if (hasVisibleText(child)) return true;
		}
	}
	return false;
}

// Sanitize HTML produced by Google Docs before the HTML→Markdown round-trip.
//
// Only runs when the HTML contains the `docs-internal-guid-` marker that
// Google Docs injects. For all other sources the HTML is returned as-is.
//
// Fixes:
// - Empty `<b>`, `<strong>`, etc. that Turndown converts to stray `**` / `*`
// - `<b style="font-weight:normal">` wrappers that are not actually bold
// - `<br>` between top-level inline elements that should be paragraph breaks
export function sanitizeGoogleDocsHtml(html: string): string {
	if (!html.includes('docs-internal-guid-')) return html;

	const doc = new DOMParser().parseFromString(html, 'text/html');

	// --- Step 1: Clean inline formatting nodes ---
	const walkAndClean = (root: Node) => {
		// Iterate in reverse so removals don't shift indices.
		const children = Array.from(root.childNodes);
		for (const node of children) {
			if (node.nodeType !== Node.ELEMENT_NODE) continue;
			const el = node as HTMLElement;
			const tag = el.tagName.toLowerCase();

			if (removableInlineTags.has(tag)) {
				if (!hasVisibleText(el)) {
					// Empty formatting tag — remove entirely.
					el.remove();
					continue;
				}
				// <b style="font-weight:normal"> is a Google Docs container, not bold.
				if (tag === 'b' && el.style.fontWeight === 'normal') {
					if (!el.parentNode) continue;
					// Unwrap: replace the <b> with its children.
					while (el.firstChild) {
						el.parentNode.insertBefore(el.firstChild, el);
					}
					el.remove();
					continue;
				}
			}

			// Skip block elements that manage their own structure.
			if (!blockTags.has(tag)) {
				walkAndClean(el);
			}
		}
	};

	walkAndClean(doc.body);

	// --- Step 2: Split <p> elements containing <br> into multiple <p> blocks ---
	// Google Docs wraps <br> inside styled <span> elements
	// (e.g. <span style="..."><br/></span>). We first unwrap those, then split
	// the <p> at <br> boundaries into separate <p> blocks.
	// Only targets <p> elements — leaves <li>, <td>, <blockquote> etc. alone.
	const paragraphs = Array.from(doc.querySelectorAll('p'));
	for (const p of paragraphs) {
		if (!p.querySelector('br')) continue;
		if (!p.parentNode) continue;

		// Unwrap <br> from inline wrappers like <span><br></span>.
		for (const child of Array.from(p.childNodes)) {
			if (child.nodeType !== Node.ELEMENT_NODE) continue;
			const el = child as Element;
			const tag = el.tagName.toLowerCase();
			if (tag === 'br') continue;
			if (blockTags.has(tag)) continue;

			// If this inline element contains ONLY <br> tags (no visible text),
			// replace the wrapper with its <br> children directly.
			if (!hasVisibleText(el) && el.querySelector('br')) {
				const brs = el.querySelectorAll('br');
				for (const br of Array.from(brs)) {
					p.insertBefore(br, el);
				}
				el.remove();
			}
		}

		// Now split the <p> at <br> boundaries.
		const nodes = Array.from(p.childNodes);
		const groups: Node[][] = [[]];

		for (const node of nodes) {
			if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br') {
				groups.push([]);
				continue;
			}
			groups[groups.length - 1].push(node);
		}

		const parent = p.parentNode;
		for (const group of groups) {
			if (!group.length) continue;
			const text = group.map(n => n.textContent).join('').trim();
			if (!text) continue;

			const newP = doc.createElement('p');
			for (const node of group) newP.appendChild(node);
			parent.insertBefore(newP, p);
		}
		parent.removeChild(p);
	}

	// --- Step 3: Normalize top-level <br>-separated inlines into <p> blocks ---
	const normalizeBrs = (container: Element) => {
		const children = Array.from(container.childNodes);
		// Only normalize if there are <br> elements at this level.
		const hasBr = children.some(
			n => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === 'br',
		);
		if (!hasBr) return;

		// Check if container already uses <p> blocks — if so, don't touch.
		const hasExistingParagraphs = children.some(
			n => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === 'p',
		);
		if (hasExistingParagraphs) return;

		const groups: Node[][] = [[]];
		for (const node of children) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as Element;
				const tag = el.tagName.toLowerCase();

				if (el.tagName.toLowerCase() === 'br') {
					// End current group, start a new one.
					groups.push([]);
					continue;
				}

				if (blockTags.has(tag)) {
					// Flush current group, pass block through as its own group.
					groups.push([node]);
					groups.push([]);
					continue;
				}
			}

			// Inline node or text node — add to current group.
			groups[groups.length - 1].push(node);
		}

		// Clear the container and rebuild with <p> wrappers.
		while (container.firstChild) container.firstChild.remove();

		for (const group of groups) {
			if (group.length === 0) continue;

			// If the group is a single block element, append it directly.
			if (group.length === 1 && group[0].nodeType === Node.ELEMENT_NODE) {
				const tag = (group[0] as Element).tagName.toLowerCase();
				if (blockTags.has(tag)) {
					container.appendChild(group[0]);
					continue;
				}
			}

			// Skip groups that are only whitespace.
			const groupText = group.map(n => n.textContent).join('').trim();
			if (!groupText) continue;

			const p = doc.createElement('p');
			for (const node of group) p.appendChild(node);
			container.appendChild(p);
		}
	};

	// Only normalize at the top-level container (body or Google's root wrapper).
	normalizeBrs(doc.body);

	// --- Step 4: Remove any remaining top-level <br> elements ---
	// After Steps 2-3, any <br> still at the body level is between <p> blocks
	// and redundant. Remove them to prevent literal <br> in Markdown output.
	for (const node of Array.from(doc.body.childNodes)) {
		if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br') {
			node.remove();
		}
	}

	return doc.body.innerHTML;
}

export async function processPastedHtml(html: string, htmlToMd: HtmlToMarkdownHandler | null, mdToHtml: MarkupToHtmlHandler | null) {
	// When copying text from eg. GitHub, the HTML might contain non-breaking
	// spaces instead of regular spaces. If these non-breaking spaces are
	// inserted into the TinyMCE editor (using insertContent), they will be
	// dropped. So here we convert them to regular spaces.
	// https://stackoverflow.com/a/31790544/561309
	html = html.replace(/[\u202F\u00A0]/g, ' ');

	// Sanitize Google Docs-specific HTML quirks before the round-trip.
	html = sanitizeGoogleDocsHtml(html);

	// The sanitizer's DOMParser→innerHTML round-trip may reintroduce &nbsp;
	// entities from the original HTML. Replace them with regular spaces.
	html = html.replace(/&nbsp;/g, ' ').replace(/[\u00A0]/g, ' ');

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
