const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const { basename, friendlySafeFilename, rtrimSlashes } = require('lib/path-utils.js');
const BaseModel = require('lib/BaseModel');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const { shim } = require('lib/shim');

class InteropService_Exporter_Md extends InteropService_Exporter_Base {
	async init(destDir) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? destDir + '/_resources' : null;
		this.createdDirs_ = [];

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	async makeDirPath_(item, pathPart = null) {
		let output = '';
		while (true) {
			if (item.type_ === BaseModel.TYPE_FOLDER) {
				if (pathPart) {
					output = pathPart + '/' + output;
				} else {
					output = friendlySafeFilename(item.title, null, true) + '/' + output;
					output = await shim.fsDriver().findUniqueFilename(output);
				}
			}
			if (!item.parent_id) return output;
			item = await Folder.load(item.parent_id);
		}
	}

	async replaceResourceIdsByRelativePaths_(item) {
		const linkedResourceIds = await Note.linkedResourceIds(item.body);
		const relativePath = rtrimSlashes(await this.makeDirPath_(item, '..'));
		const resourcePaths = this.context() && this.context().resourcePaths ? this.context().resourcePaths : {};

		let newBody = item.body;

		for (let i = 0; i < linkedResourceIds.length; i++) {
			const id = linkedResourceIds[i];
			const resourcePath = relativePath + '/_resources/' + basename(resourcePaths[id]);
			newBody = newBody.replace(new RegExp(':/' + id, 'g'), resourcePath);
		}

		return newBody;
	}

	async processItem(ItemClass, item) {
		if ([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER].indexOf(item.type_) < 0) return;

		const dirPath = this.destDir_ + '/' + (await this.makeDirPath_(item));

		if (this.createdDirs_.indexOf(dirPath) < 0) {
			await shim.fsDriver().mkdir(dirPath);
			this.createdDirs_.push(dirPath);
		}

		if (item.type_ === BaseModel.TYPE_NOTE) {
			let noteFilePath = dirPath + '/' + friendlySafeFilename(item.title, null, true) + '.md';
			noteFilePath = await shim.fsDriver().findUniqueFilename(noteFilePath);
			const noteBody = await this.replaceResourceIdsByRelativePaths_(item);
			const modNote = Object.assign({}, item, { body: noteBody });
			const noteContent = await Note.serializeForEdit(modNote);
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
