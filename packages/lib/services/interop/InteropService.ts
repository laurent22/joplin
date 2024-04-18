import { ModuleType, FileSystemItem, ImportModuleOutputFormat, ImportOptions, ExportOptions, ImportExportResult, ExportProgressState, ExportModuleOutputFormat } from './types';
import shim from '../../shim';
import { _ } from '../../locale';
import BaseItem from '../../models/BaseItem';
import BaseModel, { ModelType } from '../../BaseModel';
import Resource from '../../models/Resource';
import Folder from '../../models/Folder';
import NoteTag from '../../models/NoteTag';
import Note from '../../models/Note';
import * as ArrayUtils from '../../ArrayUtils';
import InteropService_Importer_Jex from './InteropService_Importer_Jex';
import InteropService_Importer_Md from './InteropService_Importer_Md';
import InteropService_Importer_Md_frontmatter from './InteropService_Importer_Md_frontmatter';
import InteropService_Importer_Raw from './InteropService_Importer_Raw';
import InteropService_Exporter_Jex from './InteropService_Exporter_Jex';
import InteropService_Exporter_Raw from './InteropService_Exporter_Raw';
import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import InteropService_Exporter_Md_frontmatter from './InteropService_Exporter_Md_frontmatter';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import Module, { dynamicRequireModuleFactory, makeExportModule, makeImportModule } from './Module';
const { sprintf } = require('sprintf-js');
const { fileExtension } = require('../../path-utils');
const EventEmitter = require('events');

export default class InteropService {

	private defaultModules_: Module[];
	private userModules_: Module[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			const importModules = [
				makeImportModule({
					format: 'jex',
					fileExtensions: ['jex'],
					sources: [FileSystemItem.File],
					description: _('Joplin Export File'),
				}, () => new InteropService_Importer_Jex()),

				makeImportModule({
					format: 'raw',
					sources: [FileSystemItem.Directory],
					description: _('Joplin Export Directory'),
					separatorAfter: true,
				}, () => new InteropService_Importer_Raw()),

				makeImportModule({
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.File],
					description: _('Evernote Export File (as HTML)'),
					supportsMobile: false,
					outputFormat: ImportModuleOutputFormat.Html,
				}, dynamicRequireModuleFactory('./InteropService_Importer_EnexToHtml')),

				makeImportModule({
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.File],
					description: _('Evernote Export File (as Markdown)'),
					supportsMobile: false,
					isDefault: true,
				}, dynamicRequireModuleFactory('./InteropService_Importer_EnexToMd')),

				makeImportModule({
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.Directory],
					description: _('Evernote Export Files (Directory, as HTML)'),
					supportsMobile: false,
					outputFormat: ImportModuleOutputFormat.Html,
				}, dynamicRequireModuleFactory('./InteropService_Importer_EnexToHtml')),

				makeImportModule({
					format: 'enex',
					fileExtensions: ['enex'],
					sources: [FileSystemItem.Directory],
					description: _('Evernote Export Files (Directory, as Markdown)'),
					supportsMobile: false,
				}, dynamicRequireModuleFactory('./InteropService_Importer_EnexToMd')),

				makeImportModule({
					format: 'html',
					fileExtensions: ['html'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('HTML document'),
				}, () => new InteropService_Importer_Md()),

				makeImportModule({
					format: 'md',
					fileExtensions: ['md', 'markdown', 'txt', 'html'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('Markdown'),
				}, () => new InteropService_Importer_Md()),

				makeImportModule({
					format: 'md_frontmatter',
					fileExtensions: ['md', 'markdown', 'txt', 'html'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('Markdown + Front Matter'),
				}, () => new InteropService_Importer_Md_frontmatter()),

				makeImportModule({
					format: 'txt',
					fileExtensions: ['txt'],
					sources: [FileSystemItem.File, FileSystemItem.Directory],
					isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
					description: _('Text document'),
				}, () => new InteropService_Importer_Md()),
			];

			const exportModules = [
				makeExportModule({
					format: ExportModuleOutputFormat.Jex,
					fileExtensions: ['jex'],
					target: FileSystemItem.File,
					description: _('Joplin Export File'),
				}, () => new InteropService_Exporter_Jex()),

				makeExportModule({
					format: ExportModuleOutputFormat.Raw,
					target: FileSystemItem.Directory,
					description: _('Joplin Export Directory'),
				}, () => new InteropService_Exporter_Raw()),

				makeExportModule({
					format: ExportModuleOutputFormat.Markdown,
					target: FileSystemItem.Directory,
					description: _('Markdown'),
				}, () => new InteropService_Exporter_Md()),

				makeExportModule({
					format: ExportModuleOutputFormat.MarkdownFrontMatter,
					target: FileSystemItem.Directory,
					description: _('Markdown + Front Matter'),
				}, () => new InteropService_Exporter_Md_frontmatter()),

				makeExportModule({
					format: ExportModuleOutputFormat.Html,
					fileExtensions: ['html', 'htm'],
					target: FileSystemItem.File,
					isNoteArchive: false,
					description: _('HTML File'),
					supportsMobile: false,
				}, dynamicRequireModuleFactory('./InteropService_Exporter_Html')),

				makeExportModule({
					format: ExportModuleOutputFormat.Html,
					target: FileSystemItem.Directory,
					description: _('HTML Directory'),
					supportsMobile: false,
				}, dynamicRequireModuleFactory('./InteropService_Exporter_Html')),
			];

			this.defaultModules_ = (importModules as Module[]).concat(exportModules);
		}

		return this.defaultModules_.concat(this.userModules_);
	}

	public registerModule(module: Module) {
		this.userModules_.push(module);
		this.eventEmitter_.emit('modulesChanged');
	}

	// Find the module that matches the given type ("importer" or "exporter")
	// and the given format. Some formats can have multiple associated importers
	// or exporters, such as ENEX. In this case, the one marked as "isDefault"
	// is returned. This is useful to auto-detect the module based on the format.
	// For more precise matching, newModuleFromPath_ should be used.
	private findModuleByFormat_(type: ModuleType, format: string, target: FileSystemItem = null, outputFormat: ImportModuleOutputFormat = null) {
		const modules = this.modules();
		const matches = [];

		const isMobile = shim.mobilePlatform() !== '';
		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];

			if (!m.supportsMobile && isMobile) {
				continue;
			}

			if (m.format === format && m.type === type) {
				if (!target && !outputFormat) {
					matches.push(m);
				} else if (
					m.type === ModuleType.Exporter && target && target === m.target
				) {
					matches.push(m);
				} else if (
					m.type === ModuleType.Importer && outputFormat && outputFormat === m.outputFormat
				) {
					matches.push(m);
				}
			}
		}

		const output = matches.find(m => !!m.isDefault);
		if (output) return output;

		return matches.length ? matches[0] : null;
	}

	// NOTE TO FUTURE SELF: It might make sense to simply move all the existing
	// formatters to the `newModuleFromPath_` approach, so that there's only one way
	// to do this mapping. This isn't a priority right now (per the convo in:
	// https://github.com/laurent22/joplin/pull/1795#discussion_r322379121) but
	// we can do it if it ever becomes necessary.
	private newModuleByFormat_(type: ModuleType, format: string, outputFormat: ImportModuleOutputFormat = ImportModuleOutputFormat.Markdown) {
		const moduleMetadata = this.findModuleByFormat_(type, format, null, outputFormat);
		if (!moduleMetadata) throw new Error(_('Cannot load "%s" module for format "%s" and output "%s"', type, format, outputFormat));

		return moduleMetadata.factory();
	}

	// The existing `newModuleByFormat_` fn would load by the input format. This
	// was fine when there was a 1-1 mapping of input formats to output formats,
	// but now that we have 2 possible outputs for an `enex` input, we need to be
	// explicit with which importer we want to use.
	//
	// https://github.com/laurent22/joplin/pull/1795#pullrequestreview-281574417
	private newModuleFromPath_(type: ModuleType, options: ExportOptions&ImportOptions) {
		const moduleMetadata = this.findModuleByFormat_(type, options.format, options.target);
		if (!moduleMetadata) throw new Error(_('Cannot load "%s" module for format "%s" and target "%s"', type, options.format, options.target));

		return moduleMetadata.factory(options);
	}

	private moduleByFileExtension_(type: ModuleType, ext: string) {
		ext = ext.toLowerCase();

		const modules = this.modules();

		for (let i = 0; i < modules.length; i++) {
			const m = modules[i];
			if (type !== m.type) continue;
			if (m.fileExtensions.includes(ext)) return m;
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
			options.format = module.format;
		}

		if (options.destinationFolderId) {
			const folder = await Folder.load(options.destinationFolderId);
			if (!folder) throw new Error(_('Cannot find "%s".', options.destinationFolderId));
			options.destinationFolder = folder;
		}

		let result: ImportExportResult = { warnings: [] };

		const importer = this.newModuleByFormat_(ModuleType.Importer, options.format, options.outputFormat);

		if (!(importer instanceof InteropService_Importer_Base)) {
			throw new Error('Resolved importer is not an importer');
		}

		await importer.init(options.path, options);
		result = await importer.exec(result);

		return result;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private normalizeItemForExport(_itemType: ModelType, item: any): any {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			format: ExportModuleOutputFormat.Jex,
			...options,
		};

		const exportPath = options.path ? options.path : null;
		let sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
		const result: ImportExportResult = { warnings: [] };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const itemsToExport: any[] = [];

		options.onProgress?.(ExportProgressState.QueuingItems, null);
		let totalItemsToProcess = 0;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const queueExportItem = (itemType: number, itemOrId: any) => {
			totalItemsToProcess ++;
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
		if (!(exporter instanceof InteropService_Exporter_Base)) {
			throw new Error('Resolved exporter is not an exporter');
		}

		await exporter.init(exportPath, options);

		const typeOrder = [BaseModel.TYPE_FOLDER, BaseModel.TYPE_RESOURCE, BaseModel.TYPE_NOTE, BaseModel.TYPE_TAG, BaseModel.TYPE_NOTE_TAG];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const context: any = {
			resourcePaths: {},
		};

		// Prepare to process each type before starting any
		// This will allow exporters to operate on the full context
		for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
			const type = typeOrder[typeOrderIndex];

			await exporter.prepareForProcessingItemType(type, itemsToExport);
		}

		let itemsProcessed = 0;
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

				itemsProcessed++;
				options.onProgress?.(ExportProgressState.Exporting, itemsProcessed / totalItemsToProcess);
			}
		}

		options.onProgress?.(ExportProgressState.Closing, null);
		await exporter.close();

		return result;
	}
}
