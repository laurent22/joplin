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
const { fileExtension } = require('lib/path-utils');
const { uuid } = require('lib/uuid.js');

async function temporaryDirectory(createIt) {
	const tempDir = require('os').tmpdir() + '/' + md5(Math.random() + Date.now());
	if (createIt) await fs.mkdirp(tempDir);
	return tempDir;
}

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

		this.tempDir_ = await temporaryDirectory(false);
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

class RawImporter {

	async init(sourceDir) {
		this.sourceDir_ = sourceDir;
	}

	async exec(result, options) {
		const noteIdMap = {};
		const folderIdMap = {};
		const resourceIdMap = {};
		const tagIdMap = {};
		const createdResources = {};
		const noteTagsToCreate = [];
		const destinationFolderId = options.destinationFolderId;

		const replaceResourceNoteIds = (noteBody) => {
			let output = noteBody;
			const resourceIds = Note.linkedResourceIds(noteBody);

			for (let i = 0; i < resourceIds.length; i++) {
				const id = resourceIds[i];
				if (!resourceIdMap[id]) resourceIdMap[id] = uuid.create();
				output = output.replace(new RegExp(id, 'gi'), resourceIdMap[id]);
			}

			return output;
		}

		const stats = await shim.fsDriver().readDirStats(this.sourceDir_);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			if (stat.isDirectory()) continue;
			if (fileExtension(stat.path).toLowerCase() !== 'md') continue;

			const content = await shim.fsDriver().readFile(this.sourceDir_ + '/' + stat.path);
			let item = await BaseItem.unserialize(content);
			const itemType = item.type_;
			const ItemClass = BaseItem.itemClass(item);

			delete item.type_;

			if (itemType === BaseModel.TYPE_NOTE) {
				if (!folderIdMap[item.parent_id]) folderIdMap[item.parent_id] = destinationFolderId ? destinationFolderId : uuid.create();
				const noteId = uuid.create();
				noteIdMap[item.id] = noteId;
				item.id = noteId;
				item.parent_id = folderIdMap[item.parent_id];
				item.body = replaceResourceNoteIds(item.body);
			} else if (itemType === BaseModel.TYPE_FOLDER) {
				if (destinationFolderId) continue;

				if (!folderIdMap[item.id]) folderIdMap[item.id] = uuid.create();
				item.id = folderIdMap[item.id];
				item.title = await Folder.findUniqueFolderTitle(item.title);
			} else if (itemType === BaseModel.TYPE_RESOURCE) {
				if (!resourceIdMap[item.id]) resourceIdMap[item.id] = uuid.create();
				item.id = resourceIdMap[item.id];
				createdResources[item.id] = item;
			} else if (itemType === BaseModel.TYPE_TAG) {
				const tag = await Tag.loadByTitle(item.title); 
				if (tag) {
					tagIdMap[item.id] = tag.id;
					continue;
				}

				const tagId = uuid.create();
				tagIdMap[item.id] = tagId;
				item.id = tagId;
			} else if (itemType === BaseModel.TYPE_NOTE_TAG) {
				noteTagsToCreate.push(item);
				continue;
			}

			await ItemClass.save(item, { isNew: true, autoTimestamp: false });
		}

		for (let i = 0; i < noteTagsToCreate.length; i++) {
			const noteTag = noteTagsToCreate[i];
			const newNoteId = noteIdMap[noteTag.note_id];
			const newTagId = tagIdMap[noteTag.tag_id];

			if (!newNoteId) {
				result.warnings.push(sprintf('Non-existent note %s referenced in tag %s', noteTag.note_id, noteTag.tag_id));
				continue;
			}

			if (!newTagId) {
				result.warnings.push(sprintf('Non-existent tag %s for note %s', noteTag.tag_id, noteTag.note_id));
				continue;
			}

			noteTag.id = uuid.create();
			noteTag.note_id = newNoteId;
			noteTag.tag_id = newTagId;

			await NoteTag.save(noteTag, { isNew: true });
		}

		const resourceStats = await shim.fsDriver().readDirStats(this.sourceDir_ + '/resources');

		for (let i = 0; i < resourceStats.length; i++) {
			const resourceFilePath = this.sourceDir_ + '/resources/' + resourceStats[i].path;
			const oldId = Resource.pathToId(resourceFilePath);
			const newId = resourceIdMap[oldId];
			if (!newId) {
				result.warnings.push(sprintf('Resource file is not referenced in any note and so was not imported: %s', oldId));
				continue;
			}

			const resource = createdResources[newId];
			const destPath = Resource.fullPath(resource);
			await shim.fsDriver().copy(resourceFilePath, destPath);
		}

		return result;
	}

}

class JexImporter {

	async init(sourcePath, options) {
		this.sourcePath_ = sourcePath;
	}

	async exec(result, options) {
		const tempDir = await temporaryDirectory(true);

		await require('tar').extract({
			strict: true,
			portable: true,
			file: this.sourcePath_,
			cwd: tempDir,
		});

		const importer = newImporter('raw');
		await importer.init(tempDir);
		result = await importer.exec(result, options);

		await fs.remove(tempDir);

		return result;		
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
		options = Object.assign({}, {
			format: 'auto',
			destinationFolderId: null,
		}, options);

		if (options.format === 'auto') {
			const ext = fileExtension(options.path);
			if (ext.toLowerCase() === 'jex') {
				options.format = 'jex';
			} else {
				throw new Error('Cannot automatically detect source format from path: ' + options.path);
			}
		}

		if (options.destinationFolderId) {
			const folder = await Folder.load(options.destinationFolderId);
			if (!folder) throw new Error('Notebook not found: ' + options.destinationFolderId);
		}

		let result = { warnings: [] }

		const importer = newImporter(options.format);
		await importer.init(options.path);
		result = await importer.exec(result, options);

		return result;
	}

	async export(options) {
		const exportPath = options.path ? options.path : null;
		const sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
		const exportFormat = options.format ? options.format : 'jex';
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

		const exporter = newExporter(exportFormat);
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