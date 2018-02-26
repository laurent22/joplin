const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
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

class InteropService_Importer_Raw extends InteropService_Importer_Base {

	async exec(result) {
		const noteIdMap = {};
		const folderIdMap = {};
		const resourceIdMap = {};
		const tagIdMap = {};
		const createdResources = {};
		const noteTagsToCreate = [];
		const destinationFolderId = this.options_.destinationFolderId;

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

		const stats = await shim.fsDriver().readDirStats(this.sourcePath_);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			if (stat.isDirectory()) continue;
			if (fileExtension(stat.path).toLowerCase() !== 'md') continue;

			const content = await shim.fsDriver().readFile(this.sourcePath_ + '/' + stat.path);
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

		const resourceStats = await shim.fsDriver().readDirStats(this.sourcePath_ + '/resources');

		for (let i = 0; i < resourceStats.length; i++) {
			const resourceFilePath = this.sourcePath_ + '/resources/' + resourceStats[i].path;
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
InteropService_Importer_Raw.metadata = function() {
	return {
		format: 'raw',
	};
}

module.exports = InteropService_Importer_Raw;