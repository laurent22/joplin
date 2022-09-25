import Setting from '../../../models/Setting';
import shim from '../../../shim';
import uuid from '../../../uuid';
import readonlyProperties from '../utils/readonlyProperties';
import defaultSaveOptions from '../utils/defaultSaveOptions';
import defaultAction from '../utils/defaultAction';
import BaseModel, { ModelType } from '../../../BaseModel';
import defaultLoadOptions from '../utils/defaultLoadOptions';
import { RequestMethod, Request } from '../Api';
import markdownUtils from '../../../markdownUtils';
import collectionToPaginatedResults from '../utils/collectionToPaginatedResults';

import { reg } from '../../../registry';
import Database from '../../../database';
import Folder from '../../../models/Folder';
import Note from '../../../models/Note';
import Tag from '../../../models/Tag';
import Resource from '../../../models/Resource';
import htmlUtils from '../../../htmlUtils';
import markupLanguageUtils from '../../../markupLanguageUtils';
const mimeUtils = require('../../../mime-utils.js').mime;
const md5 = require('md5');
import HtmlToMd from '../../../HtmlToMd';
const urlUtils = require('../../../urlUtils.js');
import * as ArrayUtils from '../../../ArrayUtils';
const { mimeTypeFromHeaders } = require('../../../net-utils');
const { fileExtension, safeFileExtension, safeFilename, filename } = require('../../../path-utils');
const { fileUriToPath } = require('../../../urlUtils');
const { MarkupToHtml } = require('@joplin/renderer');
const { ErrorNotFound } = require('../utils/errors');

let htmlToMdParser_: any = null;

function htmlToMdParser() {
	if (htmlToMdParser_) return htmlToMdParser_;
	htmlToMdParser_ = new HtmlToMd();
	return htmlToMdParser_;
}

async function requestNoteToNote(requestNote: any) {
	const output: any = {
		title: requestNote.title ? requestNote.title : '',
		body: requestNote.body ? requestNote.body : '',
	};

	if (requestNote.id) output.id = requestNote.id;

	const baseUrl = requestNote.base_url ? requestNote.base_url : '';

	if (requestNote.body_html) {
		if (requestNote.convert_to === 'html') {
			const style = await buildNoteStyleSheet(requestNote.stylesheets);
			const minify = require('html-minifier').minify;

			const minifyOptions = {
				// Remove all spaces and, especially, newlines from tag attributes, as that would
				// break the rendering.
				customAttrCollapse: /.*/,
				// Need to remove all whitespaces because whitespace at a beginning of a line
				// means a code block in Markdown.
				collapseWhitespace: true,
				minifyCSS: true,
				maxLineLength: 300,
			};

			const uglifycss = require('uglifycss');
			const styleString = uglifycss.processString(style.join('\n'), {
				// Need to set a max length because Ace Editor takes forever
				// to display notes with long lines.
				maxLineLen: 200,
			});

			const styleTag = style.length ? `<style>${styleString}</style>` + '\n' : '';
			let minifiedHtml = '';
			try {
				minifiedHtml = minify(requestNote.body_html, minifyOptions);
			} catch (error) {
				console.warn('Could not minify HTML - using non-minified HTML instead', error);
				minifiedHtml = requestNote.body_html;
			}
			output.body = styleTag + minifiedHtml;
			output.body = htmlUtils.prependBaseUrl(output.body, baseUrl);
			output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_HTML;
		} else {
			// Convert to Markdown
			// Parsing will not work if the HTML is not wrapped in a top level tag, which is not guaranteed
			// when getting the content from elsewhere. So here wrap it - it won't change anything to the final
			// rendering but it makes sure everything will be parsed.
			output.body = await htmlToMdParser().parse(`<div>${requestNote.body_html}</div>`, {
				baseUrl: baseUrl,
				anchorNames: requestNote.anchor_names ? requestNote.anchor_names : [],
				convertEmbeddedPdfsToLinks: true,
			});
			output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
		}
	}

	if (requestNote.parent_id) {
		output.parent_id = requestNote.parent_id;
	} else {
		const folder = await Folder.defaultFolder();
		if (!folder) throw new Error('Cannot find folder for note');
		output.parent_id = folder.id;
	}

	if ('is_todo' in requestNote) {
		output.is_todo = Database.formatValue(Database.TYPE_INT, requestNote.is_todo);
		if (output.is_todo === 1) {
			if ('todo_due' in requestNote) output.todo_due = Database.formatValue(Database.TYPE_INT, requestNote.todo_due);
			if ('todo_completed' in requestNote) output.todo_completed = Database.formatValue(Database.TYPE_INT, requestNote.todo_completed);
		}
	}

	if ('source_url' in requestNote) output.source_url = requestNote.source_url;
	if ('author' in requestNote) output.author = requestNote.author;
	if ('user_updated_time' in requestNote) output.user_updated_time = Database.formatValue(Database.TYPE_INT, requestNote.user_updated_time);
	if ('user_created_time' in requestNote) output.user_created_time = Database.formatValue(Database.TYPE_INT, requestNote.user_created_time);
	if ('markup_language' in requestNote) output.markup_language = Database.formatValue(Database.TYPE_INT, requestNote.markup_language);
	if ('longitude' in requestNote) output.longitude = requestNote.longitude;
	if ('latitude' in requestNote) output.latitude = requestNote.latitude;
	if ('altitude' in requestNote) output.altitude = requestNote.altitude;

	if (!output.markup_language) output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;

	return output;
}

async function buildNoteStyleSheet(stylesheets: any[]) {
	if (!stylesheets) return [];

	const output = [];

	for (const stylesheet of stylesheets) {
		if (stylesheet.type === 'text') {
			output.push(stylesheet.value);
		} else if (stylesheet.type === 'url') {
			try {
				const tempPath = `${Setting.value('tempDir')}/${md5(`${Math.random()}_${Date.now()}`)}.css`;
				await shim.fetchBlob(stylesheet.value, { path: tempPath, maxRetry: 1 });
				const text = await shim.fsDriver().readFile(tempPath);
				output.push(text);
				await shim.fsDriver().remove(tempPath);
			} catch (error) {
				reg.logger().warn(`Cannot download stylesheet at ${stylesheet.value}`, error);
			}
		} else {
			throw new Error(`Invalid stylesheet type: ${stylesheet.type}`);
		}
	}

	return output;
}

async function tryToGuessExtFromMimeType(response: any, mediaPath: string) {
	const mimeType = mimeTypeFromHeaders(response.headers);
	if (!mimeType) return mediaPath;

	const newExt = mimeUtils.toFileExtension(mimeType);
	if (!newExt) return mediaPath;

	const newMediaPath = `${mediaPath}.${newExt}`;
	await shim.fsDriver().move(mediaPath, newMediaPath);
	return newMediaPath;
}

async function downloadMediaFile(url: string /* , allowFileProtocolImages */) {

	const tempDir = Setting.value('tempDir');

	// The URL we get to download have been extracted from the Markdown document
	url = markdownUtils.unescapeLinkUrl(url);

	const isDataUrl = url && url.toLowerCase().indexOf('data:') === 0;

	// PDFs and other heavy resoucres are often served as seperate files insted of data urls, its very unlikely to encounter a pdf as a data url
	if (isDataUrl && !url.toLowerCase().startsWith('data:image/')) {
		reg.logger().warn(`Resources in data URL format is only supported for images ${url}`);
		return '';
	}

	const name = isDataUrl ? md5(`${Math.random()}_${Date.now()}`) : filename(url);
	let fileExt = isDataUrl ? mimeUtils.toFileExtension(mimeUtils.fromDataUrl(url)) : safeFileExtension(fileExtension(url).toLowerCase());
	if (!mimeUtils.fromFileExtension(fileExt)) fileExt = ''; // If the file extension is unknown - clear it.
	if (fileExt) fileExt = `.${fileExt}`;

	// Append a UUID because simply checking if the file exists is not enough since
	// multiple resources can be downloaded at the same time (race condition).
	let mediaPath = `${tempDir}/${safeFilename(name)}_${uuid.create()}${fileExt}`;

	try {
		if (isDataUrl) {
			await shim.imageFromDataUrl(url, mediaPath);
		} else if (urlUtils.urlProtocol(url).toLowerCase() === 'file:') {
			// Can't think of any reason to disallow this at this point
			// if (!allowFileProtocolImages) throw new Error('For security reasons, this URL with file:// protocol cannot be downloaded');
			const localPath = fileUriToPath(url);
			await shim.fsDriver().copy(localPath, mediaPath);
		} else {
			const response = await shim.fetchBlob(url, { path: mediaPath, maxRetry: 1 });

			// If we could not find the file extension from the URL, try to get it
			// now based on the Content-Type header.
			if (!fileExt) mediaPath = await tryToGuessExtFromMimeType(response, mediaPath);
		}
		return mediaPath;
	} catch (error) {
		reg.logger().warn(`Cannot download image at ${url}`, error);
		return '';
	}
}

async function downloadMediaFiles(urls: string[] /* , allowFileProtocolImages:boolean */) {
	const PromisePool = require('es6-promise-pool');

	const output: any = {};

	const downloadOne = async (url: string) => {
		const mediaPath = await downloadMediaFile(url); // , allowFileProtocolImages);
		if (mediaPath) output[url] = { path: mediaPath, originalUrl: url };
	};

	let urlIndex = 0;
	const promiseProducer = () => {
		if (urlIndex >= urls.length) return null;

		const url = urls[urlIndex++];
		return downloadOne(url);
	};

	const concurrency = 10;
	const pool = new PromisePool(promiseProducer, concurrency);
	await pool.start();

	return output;
}

async function createResourcesFromPaths(urls: string[]) {
	for (const url in urls) {
		if (!urls.hasOwnProperty(url)) continue;
		const urlInfo: any = urls[url];
		try {
			const resource = await shim.createResourceFromPath(urlInfo.path);
			urlInfo.resource = resource;
		} catch (error) {
			reg.logger().warn(`Cannot create resource for ${url}`, error);
		}
	}
	return urls;
}

async function removeTempFiles(urls: string[]) {
	for (const url in urls) {
		if (!urls.hasOwnProperty(url)) continue;
		const urlInfo: any = urls[url];
		try {
			await shim.fsDriver().remove(urlInfo.path);
		} catch (error) {
			reg.logger().warn(`Cannot remove ${urlInfo.path}`, error);
		}
	}
}

function replaceUrlsByResources(markupLanguage: number, md: string, urls: any, imageSizes: any) {
	const imageSizesIndexes: any = {};

	if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
		return htmlUtils.replaceMediaUrls(md, (url: string) => {
			const urlInfo: any = urls[url];
			if (!urlInfo || !urlInfo.resource) return url;
			return Resource.internalUrl(urlInfo.resource);
		});
	} else {
		// eslint-disable-next-line no-useless-escape
		return md.replace(/(!?\[.*?\]\()([^\s\)]+)(.*?\))/g, (_match: any, before: string, url: string, after: string) => {
			let type = 'link';
			if (before.startsWith('[embedded_pdf]')) {
				type = 'pdf';
			} else if (before.startsWith('![')) {
				type = 'image';
			}

			const urlInfo = urls[url];
			if (type === 'link' || !urlInfo || !urlInfo.resource) return before + url + after;

			const resourceUrl = Resource.internalUrl(urlInfo.resource);
			if (type === 'pdf') {
				return `[${markdownUtils.escapeLinkUrl(url)}](${resourceUrl}${after}`;
			}

			if (!(urlInfo.originalUrl in imageSizesIndexes)) imageSizesIndexes[urlInfo.originalUrl] = 0;
			const imageSizesCollection = imageSizes[urlInfo.originalUrl];
			if (!imageSizesCollection) {
				// Either its not an image or we don't know the size of the image
				// In some cases, we won't find the image size information for that particular image URL. Normally
				// it will only happen when using the "Clip simplified page" feature, which can modify the
				// image URLs (for example it will select a smaller size resolution). In that case, it's
				// fine to return the image as-is because it has already good dimensions.
				return before + resourceUrl + after;
			}

			const imageSize = imageSizesCollection[imageSizesIndexes[urlInfo.originalUrl]];
			imageSizesIndexes[urlInfo.originalUrl]++;

			if (imageSize && (imageSize.naturalWidth !== imageSize.width || imageSize.naturalHeight !== imageSize.height)) {
				return `<img width="${imageSize.width}" height="${imageSize.height}" src="${resourceUrl}"/>`;
			} else {
				return before + resourceUrl + after;
			}
		});
	}
}

export function extractMediaUrls(markupLanguage: number, text: string): string[] {
	const urls: string[] = [];
	urls.push(...ArrayUtils.unique(markupLanguageUtils.extractImageUrls(markupLanguage, text)));
	urls.push(...ArrayUtils.unique(markupLanguageUtils.extractPdfUrls(markupLanguage, text)));
	return urls;
}

// Note must have been saved first
async function attachImageFromDataUrl(note: any, imageDataUrl: string, cropRect: any) {
	const tempDir = Setting.value('tempDir');
	const mime = mimeUtils.fromDataUrl(imageDataUrl);
	let ext = mimeUtils.toFileExtension(mime) || '';
	if (ext) ext = `.${ext}`;
	const tempFilePath = `${tempDir}/${md5(`${Math.random()}_${Date.now()}`)}${ext}`;
	const imageConvOptions: any = {};
	if (cropRect) imageConvOptions.cropRect = cropRect;
	await shim.imageFromDataUrl(imageDataUrl, tempFilePath, imageConvOptions);
	return await shim.attachFileToNote(note, tempFilePath);
}

export default async function(request: Request, id: string = null, link: string = null) {
	if (request.method === 'GET') {
		if (link && link === 'tags') {
			return collectionToPaginatedResults(ModelType.Tag, await Tag.tagsByNoteId(id), request);
		} else if (link && link === 'resources') {
			const note = await Note.load(id);
			if (!note) throw new ErrorNotFound();
			const resourceIds = await Note.linkedResourceIds(note.body);
			const output = [];
			const loadOptions = defaultLoadOptions(request, BaseModel.TYPE_RESOURCE);
			for (const resourceId of resourceIds) {
				output.push(await Resource.load(resourceId, loadOptions));
			}
			return collectionToPaginatedResults(ModelType.Resource, output, request);
		} else if (link) {
			throw new ErrorNotFound();
		}

		return defaultAction(BaseModel.TYPE_NOTE, request, id, link);
	}

	if (request.method === RequestMethod.POST) {
		const requestId = Date.now();
		const requestNote = JSON.parse(request.body);

		// const allowFileProtocolImages = urlUtils.urlProtocol(requestNote.base_url).toLowerCase() === 'file:';

		const imageSizes = requestNote.image_sizes ? requestNote.image_sizes : {};

		let note: any = await requestNoteToNote(requestNote);

		const mediaUrls = extractMediaUrls(note.markup_language, note.body);

		reg.logger().info(`Request (${requestId}): Downloading media files: ${mediaUrls.length}`);

		let result = await downloadMediaFiles(mediaUrls); // , allowFileProtocolImages);

		reg.logger().info(`Request (${requestId}): Creating resources from paths: ${Object.getOwnPropertyNames(result).length}`);

		result = await createResourcesFromPaths(result);
		await removeTempFiles(result);
		note.body = replaceUrlsByResources(note.markup_language, note.body, result, imageSizes);

		reg.logger().info(`Request (${requestId}): Saving note...`);

		const saveOptions = defaultSaveOptions('POST', note.id);
		saveOptions.autoTimestamp = false; // No auto-timestamp because user may have provided them
		const timestamp = Date.now();
		note.updated_time = timestamp;
		note.created_time = timestamp;
		if (!('user_updated_time' in note)) note.user_updated_time = timestamp;
		if (!('user_created_time' in note)) note.user_created_time = timestamp;

		note = await Note.save(note, saveOptions);

		if (requestNote.tags) {
			const tagTitles = requestNote.tags.split(',');
			await Tag.setNoteTagsByTitles(note.id, tagTitles);
		}

		if (requestNote.image_data_url) {
			note = await attachImageFromDataUrl(note, requestNote.image_data_url, requestNote.crop_rect);
		}

		reg.logger().info(`Request (${requestId}): Created note ${note.id}`);

		return note;
	}

	if (request.method === 'PUT') {
		const note = await Note.load(id);

		if (!note) throw new ErrorNotFound();

		const saveOptions = {
			...defaultSaveOptions('PUT', note.id),
			autoTimestamp: false, // No auto-timestamp because user may have provided them
			userSideValidation: true,
		};

		const timestamp = Date.now();

		const newProps = request.bodyJson(readonlyProperties('PUT'));
		if (!('user_updated_time' in newProps)) newProps.user_updated_time = timestamp;
		if (newProps.is_todo === 0) {
			newProps.todo_due = 0;
			newProps.todo_completed = 0;
		}

		let newNote = {
			...note,
			...newProps,
			updated_time: timestamp,
		};

		newNote = await Note.save(newNote, saveOptions);

		const requestNote = JSON.parse(request.body);
		if (requestNote.tags || requestNote.tags === '') {
			const tagTitles = requestNote.tags.split(',');
			await Tag.setNoteTagsByTitles(id, tagTitles);
		}

		return newNote;
	}

	return defaultAction(BaseModel.TYPE_NOTE, request, id, link);
}
