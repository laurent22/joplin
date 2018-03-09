const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { basename, filename } = require('lib/path-utils.js');
const fs = require('fs-extra');
const ArrayUtils = require('lib/ArrayUtils');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');
const { uuid } = require('lib/uuid.js');
const { toTitleCase } = require('lib/string-utils');

class InteropService {

	constructor() {
		this.modules_ = null;
	}

	modules() {
		if (this.modules_) return this.modules_;

		let importModules = [
			{
				format: 'jex',
				fileExtension: 'jex',
				sources: ['file'],
				description: _('Joplin Export File'),
			}, {
				format: 'md',
				fileExtension: 'md',
				sources: ['file', 'directory'],
				isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
				description: _('Markdown'),
			}, {
				format: 'raw',
				sources: ['directory'],
				description: _('Joplin Export Directory'),
			}, {
				format: 'enex',
				fileExtension: 'enex',
				sources: ['file'],
				description: _('Evernote Export File'),
			},
		];

		let exportModules = [
			{
				format: 'jex',
				fileExtension: 'jex',
				target: 'file',
				description: _('Joplin Export File'),
			}, {
				format: 'raw',
				target: 'directory',
				description: _('Joplin Export Directory'),
			},
		];

		importModules = importModules.map((a) => {
			const className = 'InteropService_Importer_' + toTitleCase(a.format);
			const output = Object.assign({}, {
				type: 'importer',
				path: 'lib/services/' + className,
			}, a);
			if (!('isNoteArchive' in output)) output.isNoteArchive = true;
			return output;
		});

		exportModules = exportModules.map((a) => {
			const className = 'InteropService_Exporter_' + toTitleCase(a.format);
			return Object.assign({}, {
				type: 'exporter',
				path: 'lib/services/' + className,
			}, a);
		});

		this.modules_ = importModules.concat(exportModules);

		return this.modules_;
	}

	moduleByFormat_(type, format) {
		const modules = this.modules();
		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (m.format === format && m.type === type) return modules[i];
		}
		return null;
	}

	newModule_(type, format) {
		const module = this.moduleByFormat_(type, format);
		if (!module) throw new Error(_('Cannot load "%s" module for format "%s"', type, format));
		const ModuleClass = require(module.path);
		return new ModuleClass();
	}

	moduleByFileExtension_(type, ext) {
		ext = ext.toLowerCase();

		const modules = this.modules();

		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (type !== m.type) continue;
			if (m.fileExtension === ext) return m;
		}

		return null;
	}

	async import(options) {
		if (!await shim.fsDriver().exists(options.path)) throw new Error(_('Cannot find "%s".', options.path));

		options = Object.assign({}, {
			format: 'auto',
			destinationFolderId: null,
			destinationFolder: null,
		}, options);

		if (options.format === 'auto') {
			const module = this.moduleByFileExtension_('importer', fileExtension(options.path));
			if (!module) throw new Error(_('Please specify import format for %s', options.path));
			options.format = module.format;
		}

		if (options.destinationFolderId) {
			const folder = await Folder.load(options.destinationFolderId);
			if (!folder) throw new Error(_('Cannot find "%s".', options.destinationFolderId));
			options.destinationFolder = folder;
		}

		let result = { warnings: [] }

		const importer = this.newModule_('importer', options.format);
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

		const exporter = this.newModule_('exporter', exportFormat);
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

			if (item.encryption_applied || item.encryption_blob_encrypted) throw new Error(_('This item is currently encrypted: %s "%s". Please wait for all items to be decrypted and try again.', BaseModel.modelTypeToName(itemType), item.title ? item.title : item.id));

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