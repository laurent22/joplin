const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { basename, filename, rtrimSlashes } = require('lib/path-utils.js');
const fs = require('fs-extra');
const md5 = require('md5');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');
const { uuid } = require('lib/uuid.js');
const { importEnex } = require('lib/import-enex');

class InteropService_Importer_Md extends InteropService_Importer_Base {

	async exec(result) {
		let parentFolderId = null;

		const filePaths = [];
		if (await shim.fsDriver().isDirectory(this.sourcePath_)) {
			const stats = await shim.fsDriver().readDirStats(this.sourcePath_);
			for (let i = 0; i < stats.length; i++) {
				const stat = stats[i];
				if (fileExtension(stat.path).toLowerCase() === 'md') {
					filePaths.push(this.sourcePath_ + '/' + stat.path);
				}
			}

			if (!this.options_.destinationFolder) {
				const folderTitle = await Folder.findUniqueFolderTitle(basename(rtrimSlashes(this.sourcePath_)));
				const folder = await Folder.save({ title: folderTitle });
				parentFolderId = folder.id;
			} else {
				parentFolderId = this.options_.destinationFolder.id;
			}
		} else {
			if (!this.options_.destinationFolder) throw new Error(_('Please specify the notebook where the notes should be imported to.'));
			parentFolderId = this.options_.destinationFolder.id
			filePaths.push(this.sourcePath_);
		}

		for (let i = 0; i < filePaths.length; i++) {
			const path = filePaths[i];
			const stat = await shim.fsDriver().stat(path);
			if (!stat) throw new Error('Cannot read ' + path);
			const title = filename(path);
			const body = await shim.fsDriver().readFile(path);
			const note = {
				parent_id: parentFolderId,
				title: title,
				body: body,
				updated_time: stat.mtime.getTime(),
				created_time: stat.birthtime.getTime(),
				user_updated_time: stat.mtime.getTime(),
				user_created_time: stat.birthtime.getTime(),
			};
			await Note.save(note, { autoTimestamp: false });
		}

		return result;
	}

}

module.exports = InteropService_Importer_Md;