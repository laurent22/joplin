const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const InteropService_Importer_Raw = require('lib/services/InteropService_Importer_Raw');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { basename, filename } = require('lib/path-utils.js');
const fs = require('fs-extra');
const md5 = require('md5');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');
const { uuid } = require('lib/uuid.js');
const { importEnex } = require('lib/import-enex');

class InteropService_Importer_Jex extends InteropService_Importer_Base {

	async exec(result) {
		const tempDir = await this.temporaryDirectory_(true);

		try {
			await require('tar').extract({
				strict: true,
				portable: true,
				file: this.sourcePath_,
				cwd: tempDir,
			});
		} catch (error) {
			let msg = ['Cannot untar file ' + this.sourcePath_, error.message];
			if (error.data) msg.push(JSON.stringify(error.data));
			let e = new Error(msg.join(': '));
			throw e;
		}

		if (!('defaultFolderTitle' in this.options_)) this.options_.defaultFolderTitle = filename(this.sourcePath_);

		const importer = new InteropService_Importer_Raw();
		await importer.init(tempDir, this.options_);
		result = await importer.exec(result);

		await fs.remove(tempDir);

		return result;
	}

}

module.exports = InteropService_Importer_Jex;