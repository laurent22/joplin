const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const InteropService_Exporter_Raw = require('lib/services/InteropService_Exporter_Raw');
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

class InteropService_Exporter_Jex extends InteropService_Exporter_Base {

	async init(destPath) {
		if (await shim.fsDriver().isDirectory(destPath)) throw new Error('Path is a directory: ' + destPath);

		this.tempDir_ = await this.temporaryDirectory_(false);
		this.destPath_ = destPath;
		this.rawExporter_ = new InteropService_Exporter_Raw();
		await this.rawExporter_.init(this.tempDir_);
	}

	async processItem(ItemClass, item) {
		return this.rawExporter_.processItem(ItemClass, item);
	}

	async processResource(resource, filePath) {
		return this.rawExporter_.processResource(resource, filePath);
	}

	async close() {
		const stats = await shim.fsDriver().readDirStats(this.tempDir_, { recursive: true });
		const filePaths = stats.filter((a) => !a.isDirectory()).map((a) => a.path);

		if (!filePaths.length) throw new Error(_('There is no data to export.'));

		await require('tar').create({
			strict: true,
			portable: true,
			file: this.destPath_,
			cwd: this.tempDir_,
		}, filePaths);

		await fs.remove(this.tempDir_);
	}

}

module.exports = InteropService_Exporter_Jex;