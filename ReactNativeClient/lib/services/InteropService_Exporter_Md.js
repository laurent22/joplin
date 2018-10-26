const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const { basename, filename, safeFilename } = require('lib/path-utils.js');
const BaseModel = require('lib/BaseModel');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const { shim } = require('lib/shim');
const unidecode = require('unidecode');

class InteropService_Exporter_Md extends InteropService_Exporter_Base {

	async init(destDir) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? destDir + '/_resources' : null;
		this.createdDirs_ = [];

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	async makeDirPath_(item) {
		let output = '';
		while (true) {
			if (item.type_ === BaseModel.TYPE_FOLDER) {
				output = safeFilename(item.title, null, true) + '/' + output;
			}
			if (!item.parent_id) return output;
			item = await Folder.load(item.parent_id);
		}
		return output;
	}

	async processItem(ItemClass, item) {
		if ([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER].indexOf(item.type_) < 0) return;

		const filename = safeFilename(item.title, null, true);
		const dirPath = this.destDir_ + '/' + (await this.makeDirPath_(item));

		if (this.createdDirs_.indexOf(dirPath) < 0) {
			await shim.fsDriver().mkdir(dirPath);
			this.createdDirs_.push(dirPath);
		}

		if (item.type_ === BaseModel.TYPE_NOTE) {
			const noteFilePath = dirPath + '/' + safeFilename(unidecode(item.title), null, true) + '.md';
			const noteContent = await Note.serializeForEdit(item);
			await shim.fsDriver().writeFile(noteFilePath, noteContent, 'utf-8');
		}
	}

	async processResource(resource, filePath) {
		const destResourcePath = this.resourceDir_ + '/' + basename(filePath);
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	async close() {}

}

module.exports = InteropService_Exporter_Md;