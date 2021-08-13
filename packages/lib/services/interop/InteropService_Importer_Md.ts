import { ImportExportResult } from './types';
import { _ } from '../../locale';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
const { basename, filename, rtrimSlashes, fileExtension, dirname } = require('../../path-utils');
import shim from '../../shim';
import markdownUtils from '../../markdownUtils';
const { unique } = require('../../ArrayUtils');
const { pregQuote } = require('../../string-utils-common');
const { MarkupToHtml } = require('@joplin/renderer');

export default class InteropService_Importer_Md extends InteropService_Importer_Base {
	private importedNotes: any = {};

	async exec(result: ImportExportResult) {
		let parentFolderId = null;

		const sourcePath = rtrimSlashes(this.sourcePath_);

		const filePaths = [];
		if (await shim.fsDriver().isDirectory(sourcePath)) {
			if (!this.options_.destinationFolder) {
				const folderTitle = await Folder.findUniqueItemTitle(basename(sourcePath));
				const folder = await Folder.save({ title: folderTitle });
				parentFolderId = folder.id;
			} else {
				parentFolderId = this.options_.destinationFolder.id;
			}

			await this.importDirectory(sourcePath, parentFolderId);
		} else {
			if (!this.options_.destinationFolder) throw new Error(_('Please specify the notebook where the notes should be imported to.'));
			parentFolderId = this.options_.destinationFolder.id;
			filePaths.push(sourcePath);
		}

		for (let i = 0; i < filePaths.length; i++) {
			await this.importFile(filePaths[i], parentFolderId);
		}

		return result;
	}

	async importDirectory(dirPath: string, parentFolderId: string) {
		console.info(`Import: ${dirPath}`);

		const supportedFileExtension = this.metadata().fileExtensions;
		const stats = await shim.fsDriver().readDirStats(dirPath);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			if (stat.isDirectory()) {
				const folderTitle = await Folder.findUniqueItemTitle(basename(stat.path));
				const folder = await Folder.save({ title: folderTitle, parent_id: parentFolderId });
				await this.importDirectory(`${dirPath}/${basename(stat.path)}`, folder.id);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFile(`${dirPath}/${stat.path}`, parentFolderId);
			}
		}
	}

	private trimAnchorLink(link: string) {
		if (link.indexOf('#') <= 0) return link;

		const splitted = link.split('#');
		splitted.pop();
		return splitted.join('#');
	}

	/**
	 * Parse text for links, attempt to find local file, if found create Joplin resource
	 * and update link accordingly.
	 */
	async importLocalFiles(filePath: string, md: string, parentFolderId: string) {
		let updated = md;
		const fileLinks = unique(markdownUtils.extractFileUrls(md));
		await Promise.all(fileLinks.map(async (encodedLink: string) => {
			const link = decodeURI(encodedLink);
			// Handle anchor links appropriately
			const trimmedLink = this.trimAnchorLink(link);
			const attachmentPath = filename(`${dirname(filePath)}/${trimmedLink}`, true);
			const pathWithExtension = `${attachmentPath}.${fileExtension(trimmedLink)}`;
			const stat = await shim.fsDriver().stat(pathWithExtension);
			const isDir = stat ? stat.isDirectory() : false;
			if (stat && !isDir) {
				const supportedFileExtension = this.metadata().fileExtensions;
				const resolvedPath = shim.fsDriver().resolve(pathWithExtension);
				let id: string = '';
				// If the link looks like a note, then import it
				if (supportedFileExtension.indexOf(fileExtension(trimmedLink).toLowerCase()) >= 0) {
					// If the note hasn't been imported yet, do so now
					if (!this.importedNotes[resolvedPath]) {
						await this.importFile(resolvedPath, parentFolderId);
					}

					id = this.importedNotes[resolvedPath].id;
				} else {
					const resource = await shim.createResourceFromPath(pathWithExtension);
					id = resource.id;
				}

				// NOTE: use ](encodedLink in case the link also appears elsewhere, such as in alt text
				const linkPatternEscaped = pregQuote(`](${this.trimAnchorLink(encodedLink)}`);
				const reg = new RegExp(linkPatternEscaped, 'g');
				updated = updated.replace(reg, `](:/${id}`);
			}
		}));
		return updated;
	}

	async importFile(filePath: string, parentFolderId: string) {
		if (this.importedNotes[filePath]) return this.importedNotes[filePath];
		// TODO: Always create note here (to get an ID) and then fill in the body later
		// registering this here will prevent an infinite loop when running
		// into notes with cyclical references
		this.importedNotes[filePath] = { message: 'Note building in progress' };
		const stat = await shim.fsDriver().stat(filePath);
		if (!stat) throw new Error(`Cannot read ${filePath}`);
		const ext = fileExtension(filePath);
		const title = filename(filePath);
		const body = await shim.fsDriver().readFile(filePath);
		let updatedBody;
		try {
			updatedBody = await this.importLocalFiles(filePath, body, parentFolderId);
		} catch (error) {
			// console.error(`Problem importing links for file ${filePath}, error:\n ${error}`);
		}
		const note = {
			parent_id: parentFolderId,
			title: title,
			body: updatedBody || body,
			updated_time: stat.mtime.getTime(),
			created_time: stat.birthtime.getTime(),
			user_updated_time: stat.mtime.getTime(),
			user_created_time: stat.birthtime.getTime(),
			markup_language: ext === 'html' ? MarkupToHtml.MARKUP_LANGUAGE_HTML : MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
		};

		return Note.save(note, { autoTimestamp: false }).then((n) => {
			this.importedNotes[filePath] = n;
		});
	}
}
