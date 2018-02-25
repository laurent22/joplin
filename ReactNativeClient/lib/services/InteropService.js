const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { basename } = require('lib/path-utils.js');
const fs = require('fs-extra');
const md5 = require('md5');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');

class RawExporter {

	async init(destDir) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? destDir + '/resources' : null;

		await fs.mkdirp(this.destDir_);
		await fs.mkdirp(this.resourceDir_);
	}

	async processItem(ItemClass, item) {
		const serialized = await ItemClass.serialize(item);
		const filePath = this.destDir_ + '/' + ItemClass.systemPath(item);
		await fs.writeFile(filePath, serialized);
	}

	async processResource(resource, filePath) {
		const destResourcePath = this.resourceDir_ + '/' + basename(filePath);
		await fs.copyFile(filePath, destResourcePath, { overwrite: true });
	}

	async close() {}

}

class JexExporter {

	async init(destPath) {
		if (await shim.fsDriver().isDirectory(destPath)) throw new Error('Path is a directory: ' + destPath);

		this.tempDir_ = require('os').tmpdir() + '/' + md5(Math.random() + Date.now());
		this.destPath_ = destPath;
		this.rawExporter_ = new RawExporter();
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
		const filePaths = stats.map((a) => a.path);

		await require('tar').create({
			strict: true,
			portable: true,
			file: this.destPath_,
			cwd: this.tempDir_,
		}, filePaths);

		await fs.remove(this.tempDir_);
	}

}

function newExporter(format) {
	if (format === 'raw') {
		return new RawExporter();
	} else if (format === 'jex') {
		return new JexExporter();
	} else {
		throw new Error('Unknown format: ' + format);
	}
}

function newImporter(format) {
	if (format === 'raw') {
		return new RawImporter();
	} else if (format === 'jex') {
		return new JexImporter();
	} else {
		throw new Error('Unknown format: ' + format);
	}
}

class InteropService {

	async import(options) {
		const importer = newImporter(options.format);
		await importer.init(options.path);
	}

	async export(options) {
		const exportPath = options.path ? options.path : null;
		const sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
		const result = { warnings: [] }
		const itemsToExport = [];

		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId
			});
		}

		let exportedNoteIds = [];
		let resourceIds = [];
		const folderIds = await Folder.allIds();

		for (let folderIndex = 0; folderIndex < folderIds.length; folderIndex++) {
			const folderId = folderIds[folderIndex];
			if (sourceFolderIds.length && sourceFolderIds.indexOf(folderId) < 0) continue;

			if (!sourceNoteIds.length) await queueExportItem(BaseModel.TYPE_FOLDER, folderId);

			const noteIds = await Folder.noteIds(folderId);

			for (let noteIndex = 0; noteIndex < noteIds.length; noteIndex++) {
				const noteId = noteIds[noteIndex];
				if (sourceNoteIds.length && sourceNoteIds.indexOf(noteId) < 0) continue;
				const note = await Note.load(noteId);
				await queueExportItem(BaseModel.TYPE_NOTE, note);
				exportedNoteIds.push(noteId);

				const rids = Note.linkedResourceIds(note.body);
				resourceIds = resourceIds.concat(rids);
			}
		}

		for (let i = 0; i < resourceIds.length; i++) {
			await queueExportItem(BaseModel.TYPE_RESOURCE, resourceIds[i]);
		}

		const noteTags = await NoteTag.all();

		let exportedTagIds = [];

		for (let i = 0; i < noteTags.length; i++) {
			const noteTag = noteTags[i];
			if (exportedNoteIds.indexOf(noteTag.note_id) < 0) continue;
			await queueExportItem(BaseModel.TYPE_NOTE_TAG, noteTag.id);
			exportedTagIds.push(noteTag.tag_id);
		}

		for (let i = 0; i < exportedTagIds.length; i++) {
			await queueExportItem(BaseModel.TYPE_TAG, exportedTagIds[i]);
		}

		const exporter = newExporter(options.format);
		await exporter.init(exportPath);

		for (let i = 0; i < itemsToExport.length; i++) {
			const itemType = itemsToExport[i].type;
			const ItemClass = BaseItem.getClassByItemType(itemType);
			const itemOrId = itemsToExport[i].itemOrId;
			const item = typeof itemOrId === 'object' ? itemOrId : await ItemClass.load(itemOrId);

			if (!item) {
				if (itemType === BaseModel.TYPE_RESOURCE) {
					result.warnings.push(sprintf('A resource that does not exist is referenced in a note. The resource was skipped. Resource ID: %s', itemOrId));
				} else {
					result.warnings.push(sprintf('Cannot find item with type "%s" and ID %s. Item was skipped.', ItemClass.tableName(), JSON.stringify(itemOrId)));
				}
				continue;
			}

			await exporter.processItem(ItemClass, item);

			if (itemType == BaseModel.TYPE_RESOURCE) {
				const resourcePath = Resource.fullPath(item);
				await exporter.processResource(item, resourcePath);
			}
		}

		await exporter.close();

		return result;
	}

}

module.exports = InteropService;