const fs = require('fs');
const path = require('path');
const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const { basename, filename, rtrimSlashes } = require('lib/path-utils.js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');

/**
 * mdImageTagRegex matches markdown image tags.
 * !\[ and \] matches start of tag containing alt text.
 * Within this the [^\]]* matches multiple characters not in this set;
 * in this case the set is "]" - so match anything that is not this char.
 * We need this to avoid overshooting if another "]" follows after the
 * match.
 * \(.*?\) to match the part of the tag containing the link, and make this
 * a named capture group "filename".
 */
const mdImageTagRegex = /!\[[^\]]*\]\((?<filename>.*?)\)/g;

class InteropService_Importer_Md extends InteropService_Importer_Base {
	async exec(result) {
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

			this.importDirectory(sourcePath, parentFolderId);
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

	async importDirectory(dirPath, parentFolderId) {
		console.info(`Import: ${dirPath}`);

		const supportedFileExtension = this.metadata().fileExtensions;
		const stats = await shim.fsDriver().readDirStats(dirPath);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			if (stat.isDirectory()) {
				const folderTitle = await Folder.findUniqueItemTitle(basename(stat.path));
				const folder = await Folder.save({ title: folderTitle, parent_id: parentFolderId });
				this.importDirectory(`${dirPath}/${basename(stat.path)}`, folder.id);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				this.importFile(`${dirPath}/${stat.path}`, parentFolderId);
			}
		}
	}

	async importLocalImages(filePath, md) {
		let updated = md;
		let match;
		while ((match = mdImageTagRegex.exec(md)) !== null) {
			const attachmentPath = path.resolve(path.dirname(filePath), match[1])
			if (fs.existsSync(attachmentPath)) {
				console.info("Attempting to attach file ", match[1], "at position ", match.index)
				const resource = await shim.createResourceFromPath(attachmentPath);
				updated = updated.replace(match[0], Resource.markdownTag(resource))
			}
		}
		return updated;
	}

	async importFile(filePath, parentFolderId) {
		const stat = await shim.fsDriver().stat(filePath);
		if (!stat) throw new Error(`Cannot read ${filePath}`);
		const title = filename(filePath);
		const body = await shim.fsDriver().readFile(filePath);
		let updatedBody = await this.importLocalImages(filePath, body);
		const note = {
			parent_id: parentFolderId,
			title: title,
			body: updatedBody,
			updated_time: stat.mtime.getTime(),
			created_time: stat.birthtime.getTime(),
			user_updated_time: stat.mtime.getTime(),
			user_created_time: stat.birthtime.getTime(),
		};

		return await Note.save(note, { autoTimestamp: false });
	}
}

module.exports = InteropService_Importer_Md;
