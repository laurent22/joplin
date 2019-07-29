const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { filename } = require('lib/path-utils.js');
const fs = require('fs-extra');
const md5 = require('md5');

class InteropService_Importer_Enex extends InteropService_Importer_Base {
	async exec(result) {
		const { importEnex } = require('lib/import-enex');

		let folder = this.options_.destinationFolder;

		if (!folder) {
			const folderTitle = await Folder.findUniqueItemTitle(filename(this.sourcePath_));
			folder = await Folder.save({ title: folderTitle });
		}

		await importEnex(folder.id, this.sourcePath_, this.options_);

		return result;
	}
}

module.exports = InteropService_Importer_Enex;
