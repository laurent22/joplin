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
import * as os from 'os';

const { MarkupToHtml } = require('@joplin/renderer');

interface INoteInfoMap {
	pathToId: { [key: string]: string };
	IdToPath: { [key: string]: string };
}

export default class InteropService_Importer_Embeddedhtml extends InteropService_Importer_Base {
	private static readonly skipDir = 'attachment';

	public async exec(result: ImportExportResult) {
		return this.execEmbeddedHtml(result);
	}


	private async execEmbeddedHtml(result: ImportExportResult) {
		let parentFolderId = null;
		const noteInfos: INoteInfoMap = { pathToId: {}, IdToPath: {} };
		const sourcePath = rtrimSlashes(this.sourcePath_);

		const filePaths = [];

		if (await shim.fsDriver().isDirectory(sourcePath)) {
			if (!this.options_.destinationFolder) {
				parentFolderId = null;
			} else {
				parentFolderId = this.options_.destinationFolder.id;
			}

			await this.importDirectoryForEmbeddedHtml(sourcePath, parentFolderId, noteInfos);
		} else {
			if (!this.options_.destinationFolder) throw new Error(_('Please specify the notebook where the notes should be imported to.'));
			parentFolderId = this.options_.destinationFolder.id;
			filePaths.push(sourcePath);
		}

		for (let i = 0; i < filePaths.length; i++) {
			await this.importFileForEmbeddedHtml(filePaths[i], parentFolderId, noteInfos);
		}

		// change links for other notes  to joplin://
		await InteropService_Importer_Embeddedhtml.convertInternalLinks(noteInfos);
		return result;
	}

	private static async convertInternalLinks(noteInfos: INoteInfoMap): Promise<void> {
		const notePaths = Object.keys(noteInfos.pathToId);
		for (const notePath of notePaths) {
			const noteId = noteInfos.pathToId[notePath];
			await InteropService_Importer_Embeddedhtml.convertInternalLink(noteId, notePath, noteInfos);
			// console.log(`noteObj: ${JSON.stringify(noteObj, null, ' ')}`);
		}
		return;
	}

	private static async convertInternalLink(noteId: string, notePath: string, noteInfos: INoteInfoMap): Promise<void> {
		try {
			const note = await Note.loadItemById(noteId);
			const body = note.body;
			const $ = cheerio.load(body);
			const anchors = $('a[href*=".html"]');
			for (let i = 0; i < anchors.length; i++) {
				const anchor = anchors[i] as cheerio.TagElement;
				const href = anchor.attribs.href;
				if (!InteropService_Importer_Embeddedhtml.isRelative(href)) {
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
			if (stat.isDirectory() && foldername !== InteropService_Importer_Embeddedhtml.skipDir) {
				return true;
			}
		}
		return false;
	}

	async getFolderTitle(dirPath: string): Promise<string> {
		return basename(dirPath);
	}

	async importDirectoryForEmbeddedHtml(dirPath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		if (PATH.basename(dirPath) === InteropService_Importer_Embeddedhtml.skipDir || PATH.basename(dirPath) === '_') {
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
				await this.importDirectoryForEmbeddedHtml(`${dirPath}/${basename(stat.path)}`, folderId, noteInfos);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFileForEmbeddedHtml(`${dirPath}/${stat.path}`, folderId, noteInfos);
			}
		}
	}



	async importFileForEmbeddedHtml(filePath: string, parentFolderId: string, noteInfos: INoteInfoMap) {
		const stat = await shim.fsDriver().stat(filePath);
		if (!stat) throw new Error(`Cannot read ${filePath}`);
		const body = await shim.fsDriver().readFile(filePath);
		const title = PATH.basename(filePath);

		const resourceDir = Setting.value('resourceDir');
		const updatedBody = await this.modifyEmbeddedHtml(body, filePath, resourceDir);
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



	async modifyEmbeddedHtml(htmlBody: string, filePath: string, resourceDir: string): Promise<string> {
		let $: cheerio.Root | undefined = undefined;
		try {
			$ = cheerio.load(htmlBody);
		} catch (e) {
			console.log(`modifyEmbeddedHtml Error: ${e}`);
		}
		if ($ === undefined) {
			return htmlBody;
		}
		// Body部分だけを取得
		$ = this.getHTMLBody($);
		$ = await this.importEmbededImgVideoAudio($, resourceDir);
		$ = await this.importRelativePathAnchor($, filePath, resourceDir);
		$ = await this.importEmbededAnchor($, resourceDir);
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
			if (!href || !InteropService_Importer_Embeddedhtml.isRelative(href)
			|| InteropService_Importer_Embeddedhtml.isFragmentLink(href)
			|| InteropService_Importer_Embeddedhtml.isLinkToIndexHtml(href)) {
				continue;
			}
			console.log(`${htmlPath}, ${resourceDir}`);
			console.log(`relative anchor: ${href}`);

			const ext = PATH.extname(href.split('?')[0]);
			let downloadName = '';
			let absolutePath = PATH.join(PATH.dirname(htmlPath), href);
			if (PATH.basename(absolutePath).indexOf('?attredirects=') !== -1) {
				const splittedFilename = PATH.basename(absolutePath).split('?')[0];
				absolutePath = PATH.join(PATH.dirname(absolutePath), InteropService_Importer_Embeddedhtml.skipDir, splittedFilename);
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


	async importEmbededAnchor($: cheerio.Root, resourceDir: string): Promise<cheerio.Root> {
		const anchors = $('a[href^="data:"]');
		for (let i = 0; i < anchors.length; i++) {
			const anchor = anchors[i] as cheerio.TagElement;
			const href = anchor.attribs.href;
			try {
				// create img data from base64 src data
				const base64Data = href.split(',')[1];
				const data = Buffer.from(base64Data, 'base64');
				const mime = href.split(';')[0].replace('data:', '');
				const originalFilename = anchor.attribs.download ?? $(anchor).text();
				const ext = PATH.extname(originalFilename) ? PATH.extname(originalFilename) : `.${mime.split('/')[1]}`;
				const hash = crypto.createHash('sha256').update(data).digest('hex');
				console.log(`sha256 hash: ${hash}`);
				const filename = `${hash}${ext}`;
				const newFilePath = PATH.join(resourceDir, filename);
				console.log(`new filepath: ${newFilePath}`);
				anchor.attribs.href = `joplin_resource://${PATH.basename(newFilePath)}`;
				const options = {
					createFileURL: false,
					resizeLargeImages: 'never' };
				const defaultProps = {
					id: hash,
					title: `${originalFilename}`,
				};
				if (fs.existsSync(newFilePath)) {
					console.log(`same anchor resource is already exist: ${newFilePath}`);
					continue;
				}
				// get tempfolder and save file to tempfolder/originalfilename
				const tempFolder = os.tmpdir();
				const tempFile = PATH.join(tempFolder, originalFilename);
				fs.writeFileSync(tempFile, data);
				const resource = await shim.createResourceFromPath(tempFile, defaultProps, options);
				console.log(`href resource: ${JSON.stringify(resource, null, ' ')}`);
				fs.writeFileSync(newFilePath, data);
				fs.unlinkSync(tempFile);
			} catch (e) {
				console.log(`importLocalImage error: ${e} in ${href}`);
			}
		}
		return $;
	}

	async importEmbededImgVideoAudio($: cheerio.Root, resourceDir: string): Promise<cheerio.Root> {
		const imgs = $('[src^="data:"]');
		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i] as cheerio.TagElement;
			const src = img.attribs.src;
			try {
				// create img data from base64 src data
				const base64Data = src.split(',')[1];
				const data = Buffer.from(base64Data, 'base64');
				const mime = src.split(';')[0].replace('data:', '');
				const originalFilename = img.attribs.alt ?? img.attribs.title ?? `embedded.${mime.split('/')[1]}`;
				const ext = PATH.extname(originalFilename) ? PATH.extname(originalFilename) : `.${mime.split('/')[1]}`;
				const hash = crypto.createHash('sha256').update(data).digest('hex');
				console.log(`sha256 hash: ${hash}`);
				const filename = `${hash}${ext}`;
				const newFilePath = PATH.join(resourceDir, filename);
				console.log(`new filepath: ${newFilePath}`);
				img.attribs.src = `joplin_resource://${PATH.basename(newFilePath)}`;
				const options = {
					createFileURL: false,
					resizeLargeImages: 'never' };
				const defaultProps = {
					id: hash,
					title: `${originalFilename}`,
				};

				if (fs.existsSync(newFilePath)) {
					console.log(`same media resource is already exist: ${newFilePath}`);
					continue;
				}
				// get tempfolder and save file to tempfolder/originalfilename
				const tempFolder = os.tmpdir();
				const tempFile = PATH.join(tempFolder, originalFilename);
				fs.writeFileSync(tempFile, data);
				const resource = await shim.createResourceFromPath(tempFile, defaultProps, options);
				console.log(`image resource: ${JSON.stringify(resource, null, ' ')}`);
				fs.writeFileSync(newFilePath, data);
				fs.unlinkSync(tempFile);
			} catch (e) {
				console.log(`importLocalImage error: ${e} in ${src}`);
			}
		}
		return $;
	}

	async importLocalImage($: cheerio.Root, htmlPath: string, resourceDir: string): Promise<cheerio.Root> {
		const imgs = $('img');
		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i] as cheerio.TagElement;
			const src = img.attribs.src;
			if (!src || !InteropService_Importer_Embeddedhtml.isRelative(src)) {
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

	getHTMLBody($: cheerio.Root): cheerio.Root {
		const body = $('body');
		try {
			const new$ = cheerio.load(body.html());
			return new$;
		} catch (e) {
			console.log(`error in getHTMLBody: ${e}`);
			return $;
		}
	}
}
