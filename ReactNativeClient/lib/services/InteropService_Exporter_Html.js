const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const { basename, friendlySafeFilename, rtrimSlashes } = require('lib/path-utils.js');
const BaseModel = require('lib/BaseModel');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const Resource = require('lib/models/Resource');
const { shim } = require('lib/shim');
const MdToHtml = require('lib/renderers/MdToHtml.js');
const dataurl	 = require('dataurl');
const { themeStyle } = require('../../theme.js');
const { dirname } = require('lib/path-utils.js');

class InteropService_Exporter_Html extends InteropService_Exporter_Base {

	async init(path) {
		if (this.metadata().target === 'file') {
			this.destDir_ = dirname(path);
			this.filePath_ = path;
		} else {
			this.destDir_ = path;
			this.filePath_ = null;
		}

		this.createdDirs_ = [];
		this.resourceDir_ = this.destDir_ ? `${this.destDir_}/_resources` : null;

		await shim.fsDriver().mkdir(this.destDir_);
		this.mdToHtml_ = new MdToHtml();
		this.resources_ = [];
		this.style_ = themeStyle(Setting.THEME_LIGHT);
	}

	async makeDirPath_(item, pathPart = null) {
		let output = '';
		while (true) {
			if (item.type_ === BaseModel.TYPE_FOLDER) {
				if (pathPart) {
					output = `${pathPart}/${output}`;
				} else {
					output = `${friendlySafeFilename(item.title, null, true)}/${output}`;
					output = await shim.fsDriver().findUniqueFilename(output);
				}
			}
			if (!item.parent_id) return output;
			item = await Folder.load(item.parent_id);
		}
	}

	async processNoteResources_(item) {
		const target = this.metadata().target;
		const linkedResourceIds = await Note.linkedResourceIds(item.body);
		const relativePath = target === 'directory' ? rtrimSlashes(await this.makeDirPath_(item, '..')) : '';
		const resourcePaths = this.context() && this.context().resourcePaths ? this.context().resourcePaths : {};

		let newBody = item.body;

		for (let i = 0; i < linkedResourceIds.length; i++) {
			const id = linkedResourceIds[i];
			const resource = await Resource.load(id);
			let resourceContent = '';
			const isImage = Resource.isSupportedImageMimeType(resource.mime);

			if (!isImage) {
				resourceContent = `${relativePath ? `${relativePath}/` : ''}_resources/${basename(resourcePaths[id])}`;
			} else {
				const buffer = await shim.fsDriver().readFile(resourcePaths[id], 'Buffer');

				resourceContent = dataurl.convert({
					data: buffer,
					mimetype: resource.mime,
				});
			}

			newBody = newBody.replace(new RegExp(`:/${id}`, 'g'), resourceContent);
		}

		return newBody;
	}

	async processItem(ItemClass, item) {
		if ([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER].indexOf(item.type_) < 0) return;

		let dirPath = '';
		if (!this.filePath_) {
			dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;

			if (this.createdDirs_.indexOf(dirPath) < 0) {
				await shim.fsDriver().mkdir(dirPath);
				this.createdDirs_.push(dirPath);
			}
		}

		if (item.type_ === BaseModel.TYPE_NOTE) {
			let noteFilePath = '';

			if (this.filePath_) {
				noteFilePath = this.filePath_;
			} else {
				noteFilePath = `${dirPath}/${friendlySafeFilename(item.title, null, true)}.html`;
				noteFilePath = await shim.fsDriver().findUniqueFilename(noteFilePath);
			}

			const bodyMd = await this.processNoteResources_(item);
			const result = this.mdToHtml_.render(bodyMd, this.style_, { resources: this.resources_, plainResourceRendering: true });
			const noteContent = [];
			if (item.title) noteContent.push(`<div class="exported-note-title">${item.title}</div>`);
			if (result.html) noteContent.push(result.html);

			await shim.fsDriver().writeFile(noteFilePath, `<div class="exported-note">${noteContent.join('\n\n')}</div>`, 'utf-8');
		}
	}

	async processResource(resource, filePath) {
		if (!Resource.isSupportedImageMimeType(resource.mime)) {
			const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
			await shim.fsDriver().copy(filePath, destResourcePath);
			this.resources_.push(resource);
		}
	}

	async close() {}
}

module.exports = InteropService_Exporter_Html;
