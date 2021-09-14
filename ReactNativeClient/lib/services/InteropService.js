const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const ArrayUtils = require('lib/ArrayUtils');
const { sprintf } = require('sprintf-js');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
const { fileExtension } = require('lib/path-utils');
const { toTitleCase } = require('lib/string-utils');

class InteropService {
	constructor() {
		this.modules_ = null;
	}

	modules() {
		if (this.modules_) return this.modules_;

		// - canDoMultiExport: Tells whether the format can package multiple notes into one file. Default: true.

		let importModules = [
			{
				format: 'jex',
				fileExtensions: ['jex'],
				sources: ['file'],
				description: _('Joplin Export File'),
			},
			{
				format: 'md',
				fileExtensions: ['md', 'markdown', 'txt'],
				sources: ['file', 'directory'],
				isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
				description: _('Markdown'),
			},
			{
				format: 'raw',
				sources: ['directory'],
				description: _('Joplin Export Directory'),
			},
			{
				format: 'enex',
				fileExtensions: ['enex'],
				sources: ['file'],
				description: _('Evernote Export File (as Markdown)'),
				importerClass: 'InteropService_Importer_EnexToMd',
				isDefault: true,
			},
			{
				format: 'enex',
				fileExtensions: ['enex'],
				sources: ['file'],
				description: _('Evernote Export File (as HTML)'),
				// TODO: Consider doing this the same way as the multiple `md` importers are handled
				importerClass: 'InteropService_Importer_EnexToHtml',
				outputFormat: 'html',
			},
		];

		let exportModules = [
			{
				format: 'jex',
				fileExtensions: ['jex'],
				target: 'file',
				canDoMultiExport: true,
				description: _('Joplin Export File'),
			},
			{
				format: 'raw',
				target: 'directory',
				description: _('Joplin Export Directory'),
			},
			{
				format: 'json',
				target: 'directory',
				description: _('Json Export Directory'),
			},
			{
				format: 'md',
				target: 'directory',
				description: _('Markdown'),
			},
			{
				format: 'html',
				fileExtensions: ['html', 'htm'],
				target: 'file',
				canDoMultiExport: false,
				description: _('HTML File'),
			},
			{
				format: 'html',
				target: 'directory',
				description: _('HTML Directory'),
			},
		];

		importModules = importModules.map(a => {
			const className = a.importerClass || `InteropService_Importer_${toTitleCase(a.format)}`;
			const output = Object.assign({}, {
				type: 'importer',
				path: `lib/services/${className}`,
				outputFormat: 'md',
			}, a);
			if (!('isNoteArchive' in output)) output.isNoteArchive = true;
			return output;
		});

		exportModules = exportModules.map(a => {
			const className = `InteropService_Exporter_${toTitleCase(a.format)}`;
			return Object.assign(
				{},
				{
					type: 'exporter',
					path: `lib/services/${className}`,
				},
				a
			);
		});

		this.modules_ = importModules.concat(exportModules);

		this.modules_ = this.modules_.map(a => {
			a.fullLabel = function(moduleSource = null) {
				const label = [`${this.format.toUpperCase()} - ${this.description}`];
				if (moduleSource && this.sources.length > 1) {
					label.push(`(${moduleSource === 'file' ? _('File') : _('Directory')})`);
				}
				return label.join(' ');
			};
			return a;
		});

		return this.modules_;
	}

	// Find the module that matches the given type ("importer" or "exporter")
	// and the given format. Some formats can have multiple assocated importers
	// or exporters, such as ENEX. In this case, the one marked as "isDefault"
	// is returned. This is useful to auto-detect the module based on the format.
	// For more precise matching, newModuleFromPath_ should be used.
	findModuleByFormat_(type, format, target = null, outputFormat = null) {
		const modules = this.modules();
		const matches = [];
		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (m.format === format && m.type === type) {
				if (!target && !outputFormat) {
					matches.push(m);
				} else if (target && target === m.target) {
					matches.push(m);
				} else if (outputFormat && outputFormat === m.outputFormat) {
					matches.push(m);
				}
			}
		}

		const output = matches.find(m => !!m.isDefault);
		if (output) return output;

		return matches.length ? matches[0] : null;
	}

	/**
	 * NOTE TO FUTURE SELF: It might make sense to simply move all the existing
	 * formatters to the `newModuleFromPath_` approach, so that there's only one way
	 * to do this mapping. This isn't a priority right now (per the convo in:
	 * https://github.com/laurent22/joplin/pull/1795#discussion_r322379121) but
	 * we can do it if it ever becomes necessary.
	 */
	newModuleByFormat_(type, format, outputFormat = 'md') {
		const moduleMetadata = this.findModuleByFormat_(type, format, null, outputFormat);
		if (!moduleMetadata) throw new Error(_('Cannot load "%s" module for format "%s" and output "%s"', type, format, outputFormat));
		const ModuleClass = require(moduleMetadata.path);
		const output = new ModuleClass();
		output.setMetadata(moduleMetadata);
		return output;
	}

	/**
	 * The existing `newModuleByFormat_` fn would load by the input format. This
	 * was fine when there was a 1-1 mapping of input formats to output formats,
	 * but now that we have 2 possible outputs for an `enex` input, we need to be
	 * explicit with which importer we want to use.
	 *
	 * https://github.com/laurent22/joplin/pull/1795#pullrequestreview-281574417
	 */
	newModuleFromPath_(type, options) {
		let modulePath = options && options.modulePath ? options.modulePath : '';

		if (!modulePath) {
			const moduleMetadata = this.findModuleByFormat_(type, options.format, options.target);
			modulePath = moduleMetadata.path;
		}
		const ModuleClass = require(modulePath);
		const output = new ModuleClass();
		const moduleMetadata = this.findModuleByFormat_(type, options.format, options.target);
		output.setMetadata({ options, ...moduleMetadata }); // TODO: Check that this metadata is equivalent to module above
		return output;
	}

	moduleByFileExtension_(type, ext) {
		ext = ext.toLowerCase();

		const modules = this.modules();

		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (type !== m.type) continue;
			if (m.fileExtensions && m.fileExtensions.indexOf(ext) >= 0) return m;
		}

		return null;
	}

	async import(options) {
		if (!(await shim.fsDriver().exists(options.path))) throw new Error(_('Cannot find "%s".', options.path));

		options = Object.assign(
			{},
			{
				format: 'auto',
				destinationFolderId: null,
				destinationFolder: null,
			},
			options
		);

		if (options.format === 'auto') {
			const module = this.moduleByFileExtension_('importer', fileExtension(options.path));
			if (!module) throw new Error(_('Please specify import format for %s', options.path));
			// eslint-disable-next-line require-atomic-updates
			options.format = module.format;
		}

		if (options.destinationFolderId) {
			const folder = await Folder.load(options.destinationFolderId);
			if (!folder) throw new Error(_('Cannot find "%s".', options.destinationFolderId));
			// eslint-disable-next-line require-atomic-updates
			options.destinationFolder = folder;
		}

		let result = { warnings: [] };

		let importer = null;

		if (options.modulePath) {
			importer = this.newModuleFromPath_('importer', options);
		} else {
			importer = this.newModuleByFormat_('importer', options.format, options.outputFormat);
		}

		await importer.init(options.path, options);
		result = await importer.exec(result);

		return result;
	}

	async export(options) {
		options = Object.assign({}, options);
		if (!options.format) options.format = 'jex';

		const exportPath = options.path ? options.path : null;
		let sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
		const result = { warnings: [] };
		const itemsToExport = [];

		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const exportedNoteIds = [];
		let resourceIds = [];
		const folderIds = await Folder.allIds();

		let fullSourceFolderIds = sourceFolderIds.slice();
		for (let i = 0; i < sourceFolderIds.length; i++) {
			const id = sourceFolderIds[i];
			const childrenIds = await Folder.childrenIds(id);
			fullSourceFolderIds = fullSourceFolderIds.concat(childrenIds);
		}
		sourceFolderIds = fullSourceFolderIds;

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

				const rids = await Note.linkedResourceIds(note.body);
				resourceIds = resourceIds.concat(rids);
			}
		}

		resourceIds = ArrayUtils.unique(resourceIds);

		for (let i = 0; i < resourceIds.length; i++) {
			await queueExportItem(BaseModel.TYPE_RESOURCE, resourceIds[i]);
		}

		const noteTags = await NoteTag.all();

		const exportedTagIds = [];

		for (let i = 0; i < noteTags.length; i++) {
			const noteTag = noteTags[i];
			if (exportedNoteIds.indexOf(noteTag.note_id) < 0) continue;
			await queueExportItem(BaseModel.TYPE_NOTE_TAG, noteTag.id);
			exportedTagIds.push(noteTag.tag_id);
		}

		for (let i = 0; i < exportedTagIds.length; i++) {
			await queueExportItem(BaseModel.TYPE_TAG, exportedTagIds[i]);
		}

		const exporter = this.newModuleFromPath_('exporter', options);// this.newModuleByFormat_('exporter', exportFormat);
		await exporter.init(exportPath, options);

		const typeOrder = [BaseModel.TYPE_FOLDER, BaseModel.TYPE_RESOURCE, BaseModel.TYPE_NOTE, BaseModel.TYPE_TAG, BaseModel.TYPE_NOTE_TAG];
		const context = {
			resourcePaths: {},
		};

		for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
			const type = typeOrder[typeOrderIndex];

			await exporter.prepareForProcessingItemType(type, itemsToExport);

			for (let i = 0; i < itemsToExport.length; i++) {
				const itemType = itemsToExport[i].type;

				if (itemType !== type) continue;

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
						context.resourcePaths[item.id] = resourcePath;
						exporter.updateContext(context);
						await exporter.processResource(item, resourcePath);
					}

					await exporter.processItem(ItemClass, item);
				} catch (error) {
					console.error(error);
					result.warnings.push(error.message);
				}
			}
		}

		await exporter.close();

		return result;
	}
}

module.exports = InteropService;
