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
const ArrayUtils = require('lib/ArrayUtils');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');
const { uuid } = require('lib/uuid.js');
const { importEnex } = require('lib/import-enex');
const { toTitleCase } = require('lib/string-utils');

class InteropService {

	newImportExportModule_(format, className) {
		try {
			const FormatClass = require('lib/services/' + className);
			return new FormatClass();
		} catch (error) {
			error.message = _('Cannot load module for format "%s": %s', format, error.message);
			throw error;
		}
	}

	newExporter_(format) {
		return this.newImportExportModule_(format, 'InteropService_Exporter_' + toTitleCase(format));
	}

	newImporter_(format) {
		return this.newImportExportModule_(format, 'InteropService_Importer_' + toTitleCase(format));
	}

	async import(options) {
		if (!await shim.fsDriver().exists(options.path)) throw new Error(_('Cannot find "%s".', options.path));

		options = Object.assign({}, {
			format: 'auto',
			destinationFolderId: null,
			destinationFolder: null,
		}, options);

		if (options.format === 'auto') {
			const ext = fileExtension(options.path).toLowerCase();
			if (ext === 'jex') {
				options.format = 'jex';
			} else if (ext === 'enex') {
				options.format = 'enex';
			} else {
				throw new Error('Cannot automatically detect source format from path: ' + options.path);
			}
		}

		if (options.destinationFolderId) {
			const folder = await Folder.load(options.destinationFolderId);
			if (!folder) throw new Error('Notebook not found: ' + options.destinationFolderId);
			options.destinationFolder = folder;
		}

		let result = { warnings: [] }

		const importer = this.newImporter_(options.format);
		await importer.init(options.path, options);
		result = await importer.exec(result);

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

		resourceIds = ArrayUtils.unique(resourceIds);

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

		const exporter = this.newExporter_(exportFormat);
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

			try {
				if (itemType == BaseModel.TYPE_RESOURCE) {
					const resourcePath = Resource.fullPath(item);
					await exporter.processResource(item, resourcePath);
				}

				await exporter.processItem(ItemClass, item);
			} catch (error) {
				result.warnings.push(error.message);
			}
		}

		await exporter.close();

		return result;
	}

}

module.exports = InteropService;