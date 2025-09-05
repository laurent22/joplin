import { ImportExportResult } from './types';
import { _ } from '../../locale';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import * as PATH from 'path';
const { basename, rtrimSlashes, fileExtension } = require('../../path-utils');
import shim from '../../shim';
import { FolderEntity } from '../database/types';
import * as cheerio from 'cheerio';
import * as URL from 'url';
import * as fs from 'fs';
import * as crypto from 'crypto';
import Setting from '../../models/Setting';
import NoteListUtils from '../../../app-desktop/gui/utils/NoteListUtils';

const { MarkupToHtml } = require('@joplin/renderer');

interface INoteInfoMap {
	pathToId: { [key: string]: string };
	IdToPath: { [key: string]: string };
}

export default class InteropService_Importer_Html extends InteropService_Importer_Base {
	private static readonly skipDir = 'attachment';

	public async exec(result: ImportExportResult) {
		if ((this.metadata().description as string).toLocaleLowerCase().indexOf('googlesite') >= 0) {
			return this.execGoogleSite(result);
		}
		return this.execExportedSite(result);
	}

	private async execGoogleSite(result: ImportExportResult) {
		let parentFolderId = null;
		const noteInfos: INoteInfoMap = { pathToId: {}, IdToPath: {} };
		const sourcePath = rtrimSlashes(this.sourcePath_);

		const filePaths = [];

		if (await shim.fsDriver().isDirectory(sourcePath)) {
			if (!this.options_.destinationFolder) {
				// const folderTitle = await Folder.findUniqueItemTitle(basename(sourcePath));
				// const folder = await Folder.save({ title: folderTitle });
				parentFolderId = null;
			} else {
				parentFolderId = this.options_.destinationFolder.id;
			}

			await this.importDirectoryForGoogleSite(sourcePath, parentFolderId, noteInfos);
		} else {
			if (!this.options_.destinationFolder) throw new Error(_('Please specify the notebook where the notes should be imported to.'));
			parentFolderId = this.options_.destinationFolder.id;
			filePaths.push(sourcePath);
		}

		for (let i = 0; i < filePaths.length; i++) {
			await this.importFileForGoogleSite(filePaths[i], parentFolderId, noteInfos);
		}

		// change links for other notes  to joplin://
		await InteropService_Importer_Html.convertInternalLinks(noteInfos);
		await NoteListUtils.fixGoogleSiteImportedH1H2H3();
		return result;
	}


	private async execExportedSite(result: ImportExportResult) {
		let parentFolderId = null;
		const noteInfos: INoteInfoMap = { pathToId: {}, IdToPath: {} };
		const sourcePath = rtrimSlashes(this.sourcePath_);

		const filePaths = [];

		if (await shim.fsDriver().isDirectory(sourcePath)) {
			if (!this.options_.destinationFolder) {
				// const folderTitle = await Folder.findUniqueItemTitle(basename(sourcePath));
				// const folder = await Folder.save({ title: folderTitle });
				parentFolderId = null;
			} else {
				parentFolderId = this.options_.destinationFolder.id;
			}

			await this.importDirectoryForExportedSite(sourcePath, parentFolderId, noteInfos);
		} else {
			if (!this.options_.destinationFolder) throw new Error(_('Please specify the notebook where the notes should be imported to.'));
			parentFolderId = this.options_.destinationFolder.id;
			filePaths.push(sourcePath);
		}

		for (let i = 0; i < filePaths.length; i++) {
			await this.importFileForExportedSite(filePaths[i], parentFolderId, noteInfos);
		}

		// change links for other notes  to joplin://
		await InteropService_Importer_Html.convertInternalLinks(noteInfos);
		return result;
	}

	private static async convertInternalLinks(noteInfos: INoteInfoMap): Promise<void> {
		const notePaths = Object.keys(noteInfos.pathToId);
		for (const notePath of notePaths) {
			const noteId = noteInfos.pathToId[notePath];
			await InteropService_Importer_Html.convertInternalLink(noteId, notePath, noteInfos);
			// console.log(`noteObj: ${JSON.stringify(noteObj, null, ' ')}`);
		}
		return;
	}

	private static async convertInternalLink(noteId: string, notePath: string, noteInfos:INoteInfoMap): Promise<void> {
		try {
			const note = await Note.loadItemById(noteId);
			const body = note.body;
			const $ = cheerio.load(body);
			const anchors = $('a[href*=".html"]');
			for (let i = 0; i < anchors.length; i++) {
				const anchor = anchors[i] as cheerio.TagElement;
				const href = anchor.attribs.href;
				if (!InteropService_Importer_Html.isRelative(href)) {
					continue;
				}
				const url = URL.parse(href);
				const absolutePath = PATH.join(PATH.dirname(notePath), url.path);
				const linkNoteId = noteInfos.pathToId[absolutePath];
				if (linkNoteId === undefined) {
					continue;
				}
				url.protocol = 'joplin';
				url.path = absolutePath;
				let newUrl = `joplin://${linkNoteId}`;
				if (url.hash) {
					newUrl += url.hash;
				}
				anchor.attribs.href = newUrl;
			}
			note.body = $.html();
			await Note.save(note);
		} catch (e) {
			console.log(`error in convertInternalLink: ${e}`);
		}
	}

	hasDirectory(stats: any[]): boolean {
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			const foldername = basename(stat.path);
			if (stat.isDirectory() && foldername !== InteropService_Importer_Html.skipDir) {
				return true;
			}
		}
		return false;
	}

	getTitleFromGoogleHTMLFile(htmlBody: string) {
		let title = '';
		try {
			const $ = cheerio.load(htmlBody);
			const titleElement = $('#sites-page-title')[0] as cheerio.TagElement;
			title = $(titleElement).text();
		} catch (e) {
			console.log(`error gettting title: ${e}`);
		}
		return title;
	}

	async getFolderTitle(dirPath: string): Promise<string> {
		const filePath = PATH.join(dirPath, 'index.html');
		let title = '';
		try {
			const body = await shim.fsDriver().readFile(filePath);
			title = this.getTitleFromGoogleHTMLFile(body);
		} catch (e) {
			console.log(`error gettting title: ${e}`);
		}
		return title ? title : basename(dirPath);
	}

	async importDirectoryForGoogleSite(dirPath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		if (PATH.basename(dirPath) === InteropService_Importer_Html.skipDir || PATH.basename(dirPath) === '_') {
			console.log(`skipDir: ${dirPath}`);
			return;
		}
		console.info(`Import: ${dirPath}`);
		const supportedFileExtension = ['html'];
		const foldername = await this.getFolderTitle(dirPath);
		const stats = await shim.fsDriver().readDirStats(dirPath);
		const folderTitle = await Folder.findUniqueItemTitle(foldername);

		let folderId = parentFolderId;
		// 作成対象ディレクトリ内に子ディレクトが存在する場合のみフォルダを作る
		if (this.hasDirectory(stats)) {
			const folderEntity: FolderEntity = { title: folderTitle };
			if (parentFolderId !== null) {
				folderEntity.parent_id = parentFolderId;
			}
			const folder = await Folder.save(folderEntity);
			folderId = folder.id;
		}



		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			if (stat.isDirectory()) {
				await this.importDirectoryForGoogleSite(`${dirPath}/${basename(stat.path)}`, folderId, noteInfos);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFileForGoogleSite(`${dirPath}/${stat.path}`, folderId, noteInfos);
			}
		}
	}


	async importDirectoryForExportedSite(dirPath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		console.info(`Import: ${dirPath}`);
		const supportedFileExtension = ['html'];
		const foldername = basename(dirPath);
		if (foldername === 'pluginAssets') {
			return;
		}
		const stats = await shim.fsDriver().readDirStats(dirPath);
		const folderTitle = await Folder.findUniqueItemTitle(foldername);

		// 作成対象ディレクトリ内に子ディレクトが存在する場合のみフォルダを作る
		const folderEntity: FolderEntity = { title: folderTitle};
		if (parentFolderId) {
			folderEntity.parent_id = parentFolderId;
		}
		const folder = await Folder.save(folderEntity);
		const folderId = folder.id;


		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			if (stat.isDirectory()) {
				await this.importDirectoryForExportedSite(`${dirPath}/${basename(stat.path)}`, folderId, noteInfos);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFileForExportedSite(`${dirPath}/${stat.path}`, folderId, noteInfos);
			}
		}
	}


	async importFileForGoogleSite(filePath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		const stat = await shim.fsDriver().stat(filePath);
		if (!stat) throw new Error(`Cannot read ${filePath}`);
		const body = await shim.fsDriver().readFile(filePath);
		let title = this.getTitleFromGoogleHTMLFile(body);
		if (!title) {
			title = PATH.basename(PATH.dirname(filePath));
		}
		const resourceDir = Setting.value('resourceDir');
		const updatedBody = await this.modifyGoogleSiteHtml(body, filePath, resourceDir);
		const note = {
			parent_id: parentFolderId,
			title: title,
			body: updatedBody || body,
			updated_time: stat.mtime.getTime(),
			created_time: stat.birthtime.getTime(),
			user_updated_time: stat.mtime.getTime(),
			user_created_time: stat.birthtime.getTime(),
			markup_language: MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
		};

		const noteObj = await Note.save(note, { autoTimestamp: false });
		noteInfos.IdToPath[noteObj.id] = filePath;
		noteInfos.pathToId[filePath] = noteObj.id;
		console.log(`note: ${filePath} is saved!`);
		return noteObj;
	}

	async importFileForExportedSite(filePath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		const stat = await shim.fsDriver().stat(filePath);
		if (!stat) throw new Error(`Cannot read ${filePath}`);
		const body = await shim.fsDriver().readFile(filePath);
		const title = PATH.basename(filePath).split('.').slice(0, -1).join('.');
		const resourceDir = Setting.value('resourceDir');
		const updatedBody = await this.modifyExportedSiteHtml(body, filePath, resourceDir);
		const note = {
			parent_id: parentFolderId,
			title: title,
			body: updatedBody || body,
			updated_time: stat.mtime.getTime(),
			created_time: stat.birthtime.getTime(),
			user_updated_time: stat.mtime.getTime(),
			user_created_time: stat.birthtime.getTime(),
			markup_language: MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
		};

		const noteObj = await Note.save(note, { autoTimestamp: false });
		noteInfos.IdToPath[noteObj.id] = filePath;
		noteInfos.pathToId[filePath] = noteObj.id;
		console.log(`note: ${filePath} is saved!`);
		return noteObj;
	}

	async modifyGoogleSiteHtml(htmlBody: string, filePath: string, resourceDir: string): Promise<string> {
		let $: cheerio.Root | undefined = undefined;
		try {
			$ = cheerio.load(htmlBody);
		} catch (e) {
			console.log(`modifyGoogleSiteHtml Error: ${e}`);
		}
		if ($ === undefined) {
			return htmlBody;
		}
		// Googleサイトのページのメイン部分だけを取得
		$ = this.getGoogleSitePageMainContent($);
		$ = this.modifyH2_4ToH1_3($);
		$ = await this.importLocalImage($, filePath, resourceDir);
		$ = await this.importRelativePathAnchor($, filePath, resourceDir);
		return $.html();

	}

	async modifyExportedSiteHtml(htmlBody: string, filePath: string, resourceDir: string): Promise<string> {
		let $: cheerio.Root | undefined = undefined;
		try {
			$ = cheerio.load(htmlBody);
		} catch (e) {
			console.log(`modifyGoogleSiteHtml Error: ${e}`);
		}
		if ($ === undefined) {
			return htmlBody;
		}
		// Googleサイトのページのメイン部分だけを取得
		$ = await this.importLocalImage($, filePath, resourceDir);
		$ = await this.importRelativePathAnchor($, filePath, resourceDir);
		return $.html();
	}

	private static isRelative(urlstr: string): boolean {
		try {
			const parsed = URL.parse(urlstr);
			return parsed.protocol === null && !PATH.isAbsolute(urlstr);
		} catch (e) {
			return false;
		}
	}

	private static isFragmentLink(href: string): boolean {
		return !href || href.indexOf('#') === 0;
	}

	private static isLinkToIndexHtml(href: string): boolean {
		const regex = new RegExp('/index.html$');
		const regex2 = new RegExp('^index.html$');
		const lhref = href.toLocaleLowerCase();
		return regex.test(lhref) || regex2.test(lhref);
	}


	async importRelativePathAnchor($: cheerio.Root, htmlPath: string, resourceDir: string): Promise<cheerio.Root> {
		const anchors = $('a');
		for (let i = 0; i < anchors.length; i++) {
			const anchor = anchors[i] as cheerio.TagElement;
			const href = anchor.attribs.href;
			if (!href || !InteropService_Importer_Html.isRelative(href)
			|| InteropService_Importer_Html.isFragmentLink(href)
			|| InteropService_Importer_Html.isLinkToIndexHtml(href)) {
				continue;
			}
			console.log(`${htmlPath}, ${resourceDir}`);
			console.log(`relative anchor: ${href}`);

			const ext = PATH.extname(href.split('?')[0]);
			let downloadName = '';
			let absolutePath = PATH.join(PATH.dirname(htmlPath), href);
			if (PATH.basename(absolutePath).indexOf('?attredirects=') !== -1) {
				const splittedFilename = PATH.basename(absolutePath).split('?')[0];
				absolutePath = PATH.join(PATH.dirname(absolutePath), InteropService_Importer_Html.skipDir, splittedFilename);
				downloadName = splittedFilename;
			}
			console.log(`anchor absolute path: ${absolutePath}`);
			try {

				const data = fs.readFileSync(absolutePath);
				const hash = crypto.createHash('sha256').update(data).digest('hex');
				console.log(`anchor sha256 hash: ${hash}`);
				const filename = `${hash}${ext}`;
				console.log(`anchor filename: ${PATH.basename(href)} --> ${filename}`);
				const newFilePath = PATH.join(resourceDir, filename);
				console.log(`anchor new filepath: ${newFilePath}`);
				anchor.attribs.href = `joplin_resource://${PATH.basename(newFilePath)}`;
				anchor.attribs.alt = `${PATH.basename(href)}`;
				const options = {
					createFileURL: false,
					resizeLargeImages: 'never' };
				const defaultProps = {
					id: hash,
					title: `${PATH.basename(href)}`,
				};
				const resource = await shim.createResourceFromPath(absolutePath, defaultProps, options);
				console.log(`image resource: ${JSON.stringify(resource, null, ' ')}`);
				if (downloadName) {
					anchor.attribs.download = downloadName;
				}
				fs.writeFileSync(newFilePath, data);
			} catch (e) {
				console.log(`import anchor error: ${e}`);
				console.log(`importing anchor error: ${absolutePath}`);
			}
		}
		return $;
	}

	async importLocalImage($: cheerio.Root, htmlPath: string, resourceDir: string): Promise<cheerio.Root> {
		const imgs = $('img');
		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i] as cheerio.TagElement;
			const src = img.attribs.src;
			if (!src || !InteropService_Importer_Html.isRelative(src)) {
				continue;
			}
			try {
				console.log(`find relative path image: ${src}`);
				const ext = PATH.extname(src);
				const absolutePath = PATH.join(PATH.dirname(htmlPath), src);
				console.log(`absolute path: ${absolutePath}`);
				const data = fs.readFileSync(absolutePath);
				const hash = crypto.createHash('sha256').update(data).digest('hex');
				console.log(`sha256 hash: ${hash}`);
				const filename = `${hash}${ext}`;
				console.log(`filename: ${PATH.basename(src)} --> ${filename}`);
				const newFilePath = PATH.join(resourceDir, filename);
				console.log(`new filepath: ${newFilePath}`);
				img.attribs.src = `joplin_resource://${PATH.basename(newFilePath)}`;
				img.attribs.alt = `${PATH.basename(src)}`;
				const options = {
					createFileURL: false,
					resizeLargeImages: 'never' };
				const defaultProps = {
					id: hash,
					title: `${PATH.basename(src)}`,
				};
				const resource = await shim.createResourceFromPath(absolutePath, defaultProps, options);
				console.log(`image resource: ${JSON.stringify(resource, null, ' ')}`);
				fs.writeFileSync(newFilePath, data);

			} catch (e) {
				console.log(`importLocalImage error: ${e} in ${src}`);
			}
		}
		return $;
	}

	getGoogleSitePageMainContent($: cheerio.Root): cheerio.Root {
		const mainContent = $('#sites-canvas-main-content > table > tbody > tr > td > div');
		try {
			const new$ = cheerio.load(mainContent.html());
			return new$;
		} catch (e) {
			console.log(`error in getGoogleSitePageMainContent: ${e}`)
			return $;
		}
	}

	modifyHx($: cheerio.Root, targetNum: number): cheerio.Root {
		const hxs = $(`h${targetNum}`);
		for (let i = 0; i < hxs.length; i++) {
			const hx = hxs[i] as cheerio.TagElement;
			hx.name = `h${targetNum - 1}`;
		}
		return $;

	}

	modifyH2_4ToH1_3($: cheerio.Root): cheerio.Root {
		$ = this.modifyHx($, 2);
		$ = this.modifyHx($, 3);
		$ = this.modifyHx($, 4);

		return $;
	}


	public static async convertAnotherJoplinResource(noteId: string): Promise<void> {
		const note = await Note.load(noteId);
		const profileDir = Setting.value('profileDir');
		const searchTargetDir = PATH.dirname(profileDir);
		const resourceDir = Setting.value('resourceDir');
		let $ = cheerio.load(note.body);
		$ = await InteropService_Importer_Html.convertAnotherJoplinImage($, resourceDir, searchTargetDir);
		$ = await InteropService_Importer_Html.convertAnotherJoplinAnchor($, resourceDir, searchTargetDir);
		const convertedHTML = $.html();
		note.body = convertedHTML;
		await Note.save(note);

	}

	private static isAnotherJoplinResource(imgPath: string, resourceDir: string, searchTargetDir: string): boolean {
		if (!imgPath) {
			return false;
		}
		const parsedUrl = URL.parse(imgPath);
		const protocol = parsedUrl.protocol;
		if (protocol && protocol.toLowerCase() !== "file:") {
			return false;
		}
		imgPath = parsedUrl.pathname;
		const imgResourceDir = PATH.dirname(imgPath);
		if (resourceDir === imgResourceDir) {
			// this image is same joplin resource;
			return false;
		}
		// joplin's resource folder must be resources
		if (PATH.basename(resourceDir) !== PATH.basename(imgResourceDir)) {
			// resource foldername is not "resources"
			return false;
		}

		const imgProfileDir = PATH.dirname(PATH.dirname(imgPath));
		const imageProfileDirName = PATH.basename(imgProfileDir);
		if (imageProfileDirName.toLocaleLowerCase().indexOf('joplin') !== 0) {
			return false;
		}
		const aboveProfileDir = PATH.dirname(imgProfileDir);
		return aboveProfileDir === searchTargetDir;
	}

	private static async importOneAnotherJoplinResource(absolutePath: string, resourceDir: string): Promise<string> {
		try {
			const ext = PATH.extname(absolutePath);
			console.log(`absolute path: ${absolutePath}`);
			const data = fs.readFileSync(absolutePath);
			const hash = crypto.createHash('sha256').update(data).digest('hex');
			console.log(`sha256 hash: ${hash}`);
			const filename = `${hash}${ext}`;
			console.log(`filename: ${PATH.basename(absolutePath)} --> ${filename}`);
			const newFilePath = PATH.join(resourceDir, filename);
			console.log(`new filepath: ${newFilePath}`);
			const resultJoplinSchemePath = `joplin_resource://${PATH.basename(newFilePath)}`;
			const options = {
				createFileURL: false,
				resizeLargeImages: 'never' };
			const defaultProps = {
				id: hash,
				title: `${PATH.basename(absolutePath)}`,
			};
			try {
				const resource = await shim.createResourceFromPath(absolutePath, defaultProps, options);
				console.log(`image resource: ${JSON.stringify(resource, null, ' ')}`);
				fs.writeFileSync(newFilePath, data);
			} catch (e) {
				console.log(`same resource is already exist: ${absolutePath}, error = ${e.toString()}`);
			}
			return resultJoplinSchemePath;
		} catch (e) {
			console.log(`importLocalImage error: ${e} in ${absolutePath}`);
		}
		return '';
	}

	private static async convertAnotherJoplinAnchor($: cheerio.Root, resourceDir: string, searchTargetDir: string): Promise<cheerio.Root> {
		const anchors = $('a');
		console.log(`search Target: ${searchTargetDir}`);
		console.log(`resourceDir: ${resourceDir}`);
		let count = 0;
		for (let i = 0; i < anchors.length; i++) {
			const anchor = anchors[i] as cheerio.TagElement;
			let href = anchor.attribs.href;
			try {
				if (!InteropService_Importer_Html.isAnotherJoplinResource(href, resourceDir, searchTargetDir)) {
					continue;
				}
				const parsedUrl = URL.parse(href);
				href = parsedUrl.pathname; // fix hoge/hoge.jpg?t=xxxx --> hoge/hoge.jpg
				console.log(`find Another joplin resource: ${href}`);
				const newHref = await InteropService_Importer_Html.importOneAnotherJoplinResource(href, resourceDir);
				if (newHref) {
					anchor.attribs.href = newHref;
					anchor.attribs.title = newHref;
					anchor.attribs['data-mce-src'] = newHref;
					count++;
				}
			} catch (e) {
				console.log(`[convertAnotherJoplinImage] error href=${href}, error=${e.toString()} `);
			}
		}
		console.log(`[convertAnotherJoplinImage] convert ${count} anchors`);
		return $;
	}

	private static async convertAnotherJoplinImage($: cheerio.Root, resourceDir: string, searchTargetDir: string): Promise<cheerio.Root> {
		const imgs = $('img');
		console.log(`search Target: ${searchTargetDir}`);
		console.log(`resourceDir: ${resourceDir}`);
		let count = 0;
		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i] as cheerio.TagElement;
			let src = img.attribs.src;
			try {
				if (!InteropService_Importer_Html.isAnotherJoplinResource(src, resourceDir, searchTargetDir)) {
					continue;
				}
				const parsedUrl = URL.parse(src);
				src = parsedUrl.pathname; // fix hoge/hoge.jpg?t=xxxx --> hoge/hoge.jpg
				console.log(`find Another joplin resource: ${src}`);
				const newSrc = await InteropService_Importer_Html.importOneAnotherJoplinResource(src, resourceDir);
				if (newSrc) {
					img.attribs.src = newSrc;
					count++;
				}
			} catch (e) {
				console.log(`error src=${src}, error=${e.toString()} `);
			}
		}
		console.log(`[convertAnotherJoplinImage] convert ${count} images`);
		return $;
	}
}
