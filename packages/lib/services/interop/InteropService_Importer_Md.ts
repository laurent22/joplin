import { ImportExportResult } from './types';
import { _ } from '../../locale';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { NoteEntity } from '../database/types';
import { basename, filename, rtrimSlashes, fileExtension, dirname } from '../../path-utils';
import shim from '../../shim';
import markdownUtils from '../../markdownUtils';
import htmlUtils from '../../htmlUtils';
import { unique } from '../../ArrayUtils';
const { pregQuote } = require('../../string-utils-common');
import { MarkupToHtml } from '@joplin/renderer';
import { isDataUrl } from '@joplin/utils/url';
import { stripBom } from '../../string-utils';

export default class InteropService_Importer_Md extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	public async exec(result: ImportExportResult) {
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

		for (const importedLocalPath of Object.keys(this.importedNotes)) {
			const note = this.importedNotes[importedLocalPath];
			const updatedBody = await this.importLocalFiles(importedLocalPath, note.body, note.parent_id);
			const updatedNote = {
				...this.importedNotes[importedLocalPath],
				body: updatedBody || note.body,
			};
			this.importedNotes[importedLocalPath] = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });
		}

		return result;
	}

	public async importDirectory(dirPath: string, parentFolderId: string) {
		const supportedFileExtension = this.metadata().fileExtensions;
		const stats = await shim.fsDriver().readDirStats(dirPath);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			if (stat.isDirectory()) {
				if (await this.isDirectoryEmpty(`${dirPath}/${stat.path}`)) {
					continue;
				}
				const folderTitle = await Folder.findUniqueItemTitle(basename(stat.path));
				const folder = await Folder.save({ title: folderTitle, parent_id: parentFolderId });
				await this.importDirectory(`${dirPath}/${basename(stat.path)}`, folder.id);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFile(`${dirPath}/${stat.path}`, parentFolderId);
			}
		}
	}

	private async isDirectoryEmpty(dirPath: string) {
		const supportedFileExtension = this.metadata().fileExtensions;
		const innerStats = await shim.fsDriver().readDirStats(dirPath);
		for (let i = 0; i < innerStats.length; i++) {
			const innerStat = innerStats[i];

			if (innerStat.isDirectory()) {
				if (!(await this.isDirectoryEmpty(`${dirPath}/${innerStat.path}`))) {
					return false;
				}
			} else if (supportedFileExtension.indexOf(fileExtension(innerStat.path).toLowerCase()) >= 0) {
				return false;
			}
		}
		return true;

	}

	private trimAnchorLink(link: string) {
		if (link.indexOf('#') <= 0) return link;

		const splitted = link.split('#');
		splitted.pop();
		return splitted.join('#');
	}

	// Parse text for links, attempt to find local file, if found create Joplin resource
	// and update link accordingly.
	public async importLocalFiles(filePath: string, md: string, parentFolderId: string) {
		let updated = md;
		const markdownLinks = markdownUtils.extractFileUrls(md);
		const htmlLinks = htmlUtils.extractFileUrls(md);
		const fileLinks = unique(markdownLinks.concat(htmlLinks));
		for (const encodedLink of fileLinks) {
			let link = '';
			try {
				link = decodeURI(encodedLink);
			} catch (error) {
				// If the URI cannot be decoded, leave it as it is.
				continue;
			}

			if (isDataUrl(link)) {
				// Just leave it as it is. We could potentially import
				// it as a resource but for now that's good enough.
				continue;
			} else {
				// Handle anchor links appropriately
				const trimmedLink = this.trimAnchorLink(link);
				const attachmentPath = filename(`${dirname(filePath)}/${trimmedLink}`, true);
				const pathWithExtension = `${attachmentPath}.${fileExtension(trimmedLink)}`;
				const stat = await shim.fsDriver().stat(pathWithExtension);
				const isDir = stat ? stat.isDirectory() : false;
				if (stat && !isDir) {
					const supportedFileExtension = this.metadata().fileExtensions;
					const resolvedPath = shim.fsDriver().resolve(pathWithExtension);
					let id = '';
					// If the link looks like a note, then import it
					if (supportedFileExtension.indexOf(fileExtension(trimmedLink).toLowerCase()) >= 0) {
						// If the note hasn't been imported yet, do so now
						if (!this.importedNotes[resolvedPath]) {
							await this.importFile(resolvedPath, parentFolderId);
						}

						id = this.importedNotes[resolvedPath].id;
					} else {
						const resource = await shim.createResourceFromPath(pathWithExtension, null, { resizeLargeImages: 'never' });
						id = resource.id;
					}

					// The first is a normal link, the second is supports the <link> and [](<link with spaces>) syntax
					// Only opening patterns are consider in order to cover all occurrences
					// We need to use the encoded link as well because some links (link's with spaces)
					// will appear encoded in the source. Other links (unicode chars) will not
					const linksToReplace = [this.trimAnchorLink(link), this.trimAnchorLink(encodedLink)];

					for (let j = 0; j < linksToReplace.length; j++) {
						const linkToReplace = pregQuote(linksToReplace[j]);

						// Markdown links
						updated = markdownUtils.replaceResourceUrl(updated, linkToReplace, id);

						// HTML links
						updated = htmlUtils.replaceResourceUrl(updated, linkToReplace, id);
					}
				}
			}
		}
		return updated;
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const resolvedPath = shim.fsDriver().resolve(filePath);
		if (this.importedNotes[resolvedPath]) return this.importedNotes[resolvedPath];

		const stat = await shim.fsDriver().stat(resolvedPath);
		if (!stat) throw new Error(`Cannot read ${resolvedPath}`);
		const ext = fileExtension(resolvedPath);
		const title = filename(resolvedPath);
		const body = stripBom(await shim.fsDriver().readFile(resolvedPath));

		const note = {
			parent_id: parentFolderId,
			title: title,
			body: body,
			updated_time: stat.mtime.getTime(),
			created_time: stat.birthtime.getTime(),
			user_updated_time: stat.mtime.getTime(),
			user_created_time: stat.birthtime.getTime(),
			markup_language: ext === 'html' ? MarkupToHtml.MARKUP_LANGUAGE_HTML : MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
		};
		this.importedNotes[resolvedPath] = await Note.save(note, { autoTimestamp: false });

		return this.importedNotes[resolvedPath];
	}
}
