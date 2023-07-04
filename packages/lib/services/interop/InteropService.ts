import { ModuleType, FileSystemItem, ImportModuleOutputFormat, Module, ImportOptions, ExportOptions, ImportExportResult, defaultImportExportModule } from './types';
import InteropService_Importer_Custom from './InteropService_Importer_Custom';
import InteropService_Exporter_Custom from './InteropService_Exporter_Custom';
import shim from '../../shim';
import { _ } from '../../locale';
import BaseItem from '../../models/BaseItem';
import BaseModel, { ModelType } from '../../BaseModel';
import Resource from '../../models/Resource';
import Folder from '../../models/Folder';
import NoteTag from '../../models/NoteTag';
import Note from '../../models/Note';
import * as ArrayUtils from '../../ArrayUtils';
const { sprintf } = require('sprintf-js');
const { fileExtension } = require('../../path-utils');
const { toTitleCase } = require('../../string-utils');
const EventEmitter = require('events');

export default class InteropService {

	private defaultModules_: Module[];
	private userModules_: Module[] = [];
	private eventEmitter_: any = null;
	private static instance_: InteropService;

	public static instance(): InteropService {
		if (!this.instance_) this.instance_ = new InteropService();
		return this.instance_;
	}

	public constructor() {
		this.eventEmitter_ = new EventEmitter();
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public modules() {
		if (!this.defaultModules_) {
			const importModules: Module[] = [
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'jex',
					fileExtensions: ['jex'],
					sources: [FileSystemItem.File],
					description: _('Joplin Export File'),
				},
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'md',
					fileExtensions: ['md', 'markdown', 'txt', 'html'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('Markdown'),
				},
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'md_frontmatter',
					fileExtensions: ['md', 'markdown', 'txt', 'html'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('Markdown + Front Matter'),
				},
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'raw',
					sources: [FileSystemItem.Directory],
					description: _('Joplin Export Directory'),
				},
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.File],
					description: _('Evernote Export File (as Markdown)'),
					importerClass: 'InteropService_Importer_EnexToMd',
					isDefault: true,
				},
				{
					...defaultImportExportModule(ModuleType.Importer),
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.File],
					description: _('Evernote Export File (as HTML)'),
					// TODO: Consider doing this the same way as the multiple `md` importers are handled
					importerClass: 'InteropService_Importer_EnexToHtml',
					outputFormat: ImportModuleOutputFormat.Html,
				},
			];

			const exportModules: Module[] = [
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'jex',
					fileExtensions: ['jex'],
					target: FileSystemItem.File,
					description: _('Joplin Export File'),
				},
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'raw',
					target: FileSystemItem.Directory,
					description: _('Joplin Export Directory'),
				},
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'md',
					target: FileSystemItem.Directory,
					description: _('Markdown'),
				},
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'md_frontmatter',
					target: FileSystemItem.Directory,
					description: _('Markdown + Front Matter'),
				},
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'html',
					fileExtensions: ['html', 'htm'],
					target: FileSystemItem.File,
					isNoteArchive: false,
					description: _('HTML File'),
				},
				{
					...defaultImportExportModule(ModuleType.Exporter),
					format: 'html',
					target: FileSystemItem.Directory,
					description: _('HTML Directory'),
				},
			];

			this.defaultModules_ = importModules.concat(exportModules);
		}

		return this.defaultModules_.concat(this.userModules_);
	}

	public registerModule(module: Module) {
		module = {
			...defaultImportExportModule(module.type),
			...module,
		};

		this.userModules_.push(module);

		this.eventEmitter_.emit('modulesChanged');
	}

	// Find the module that matches the given type ("importer" or "exporter")
	// and the given format. Some formats can have multiple assocated importers
	// or exporters, such as ENEX. In this case, the one marked as "isDefault"
	// is returned. This is useful to auto-detect the module based on the format.
	// For more precise matching, newModuleFromPath_ should be used.
	private findModuleByFormat_(type: ModuleType, format: string, target: FileSystemItem = null, outputFormat: ImportModuleOutputFormat = null) {
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

	private modulePath(module: Module) {
		let className = '';
		if (module.type === ModuleType.Importer) {
			className = module.importerClass || `InteropService_Importer_${toTitleCase(module.format)}`;
		} else {
			className = `InteropService_Exporter_${toTitleCase(module.format)}`;
		}
		return `./${className}`;
	}

	private newModuleFromCustomFactory(module: Module) {
		if (module.type === ModuleType.Importer) {
			return new InteropService_Importer_Custom(module);
		} else {
			return new InteropService_Exporter_Custom(module);
		}
	}

	// NOTE TO FUTURE SELF: It might make sense to simply move all the existing
	// formatters to the `newModuleFromPath_` approach, so that there's only one way
	// to do this mapping. This isn't a priority right now (per the convo in:
	// https://github.com/laurent22/joplin/pull/1795#discussion_r322379121) but
	// we can do it if it ever becomes necessary.
	private newModuleByFormat_(type: ModuleType, format: string, outputFormat: ImportModuleOutputFormat = ImportModuleOutputFormat.Markdown) {
		const moduleMetadata = this.findModuleByFormat_(type, format, null, outputFormat);
		if (!moduleMetadata) throw new Error(_('Cannot load "%s" module for format "%s" and output "%s"', type, format, outputFormat));

		let output = null;

		if (moduleMetadata.isCustom) {
			output = this.newModuleFromCustomFactory(moduleMetadata);
		} else {
			const ModuleClass = shim.requireDynamic(this.modulePath(moduleMetadata)).default;
			output = new ModuleClass();
		}

		output.setMetadata(moduleMetadata);

		return output;
	}

	// The existing `newModuleByFormat_` fn would load by the input format. This
	// was fine when there was a 1-1 mapping of input formats to output formats,
	// but now that we have 2 possible outputs for an `enex` input, we need to be
	// explicit with which importer we want to use.
	//
	// https://github.com/laurent22/joplin/pull/1795#pullrequestreview-281574417
	private newModuleFromPath_(type: ModuleType, options: any) {
		const moduleMetadata = this.findModuleByFormat_(type, options.format, options.target);
		if (!moduleMetadata) throw new Error(_('Cannot load "%s" module for format "%s" and target "%s"', type, options.format, options.target));

		let output = null;

		if (moduleMetadata.isCustom) {
			output = this.newModuleFromCustomFactory(moduleMetadata);
		} else {
			const modulePath = this.modulePath(moduleMetadata);
			const ModuleClass = shim.requireDynamic(modulePath).default;
			output = new ModuleClass();
		}

		output.setMetadata({ options, ...moduleMetadata });

		return output;
	}

	private moduleByFileExtension_(type: ModuleType, ext: string) {
		ext = ext.toLowerCase();

		const modules = this.modules();

		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (type !== m.type) continue;
			if (m.fileExtensions && m.fileExtensions.indexOf(ext) >= 0) return m;
		}

		return null;
	}

	public async import(options: ImportOptions): Promise<ImportExportResult> {
		if (!(await shim.fsDriver().exists(options.path))) throw new Error(_('Cannot find "%s".', options.path));

		options = {
			format: 'auto',
			destinationFolderId: null,
			destinationFolder: null,
			...options,
		};

		if (options.format === 'auto') {
			const module = this.moduleByFileExtension_(ModuleType.Importer, fileExtension(options.path));
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

		let result: ImportExportResult = { warnings: [] };

		const importer = this.newModuleByFormat_(ModuleType.Importer, options.format, options.outputFormat);

		await importer.init(options.path, options);
		result = await importer.exec(result);

		return result;
	}

	private normalizeItemForExport(_itemType: ModelType, item: any): any {
		const override: any = {};
		if ('is_shared' in item) override.is_shared = 0;
		if ('share_id' in item) override.share_id = '';

		if (Object.keys(override).length) {
			return {
				...item,
				...override,
			};
		} else {
			return item;
		}
	}

	public async export(options: ExportOptions): Promise<ImportExportResult> {
		options = {
			format: 'jex',
			...options,
		};

		const exportPath = options.path ? options.path : null;
		let sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
		const result: ImportExportResult = { warnings: [] };
		const itemsToExport: any[] = [];

		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const exportedNoteIds = [];
		let resourceIds: string[] = [];

		// Recursively get all the folders that have valid parents
		const folderIds = await Folder.childrenIds('');

		if (options.includeConflicts) folderIds.push(Folder.conflictFolderId());

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

			const noteIds = await Folder.noteIds(folderId, { includeConflicts: !!options.includeConflicts });

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

		const exporter = this.newModuleFromPath_(ModuleType.Exporter, options);
		await exporter.init(exportPath, options);

		const typeOrder = [BaseModel.TYPE_FOLDER, BaseModel.TYPE_RESOURCE, BaseModel.TYPE_NOTE, BaseModel.TYPE_TAG, BaseModel.TYPE_NOTE_TAG];
		const context: any = {
			resourcePaths: {},
		};

		// Prepare to process each type before starting any
		// This will allow exporters to operate on the full context
		for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
			const type = typeOrder[typeOrderIndex];

			await exporter.prepareForProcessingItemType(type, itemsToExport);
		}

		for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
			const type = typeOrder[typeOrderIndex];

			for (let i = 0; i < itemsToExport.length; i++) {
				const itemType = itemsToExport[i].type;

				if (itemType !== type) continue;

				const ItemClass = BaseItem.getClassByItemType(itemType);
				const itemOrId = itemsToExport[i].itemOrId;
				const rawItem = typeof itemOrId === 'object' ? itemOrId : await ItemClass.load(itemOrId);

				if (!rawItem) {
					if (itemType === BaseModel.TYPE_RESOURCE) {
						result.warnings.push(sprintf('A resource that does not exist is referenced in a note. The resource was skipped. Resource ID: %s', itemOrId));
					} else {
						result.warnings.push(sprintf('Cannot find item with type "%s" and ID %s. Item was skipped.', ItemClass.tableName(), JSON.stringify(itemOrId)));
					}
					continue;
				}

				const item = this.normalizeItemForExport(itemType, rawItem);

				if (item.encryption_applied || item.encryption_blob_encrypted) {
					result.warnings.push(sprintf('This item is currently encrypted: %s "%s" (%s) and was not exported. You may wait for it to be decrypted and try again.', BaseModel.modelTypeToName(itemType), item.title ? item.title : item.id, item.id));
					continue;
				}

				try {
					if (itemType === BaseModel.TYPE_RESOURCE) {
						const resourcePath = Resource.fullPath(item);
						context.resourcePaths[item.id] = resourcePath;
						exporter.updateContext(context);
						await exporter.processResource(item, resourcePath);
					}

					await exporter.processItem(itemType, item);
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
