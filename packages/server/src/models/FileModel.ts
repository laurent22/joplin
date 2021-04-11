import BaseModel, { ValidateOptions, SaveOptions as BaseSaveOptions, DeleteOptions as BaseDeleteOptions } from './BaseModel';
import { File, ItemType, databaseSchema, Uuid, FileContentType } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound, ErrorBadRequest, ErrorConflict } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import { splitItemPath, filePathInfo } from '../utils/routeUtils';
import { paginateDbQuery, PaginatedResults, Pagination } from './utils/pagination';
import { setQueryParameters } from '../utils/urlUtils';
import { Models } from './factory';

const mimeUtils = require('@joplin/lib/mime-utils.js').mime;

const nodeEnv = process.env.NODE_ENV || 'development';

const removeTrailingColonsRegex = /^(:|)(.*?)(:|)$/;

export type FileContent = any;

export interface LoadContentHandlerEvent {
	models: Models;
	file: File;
	content: FileContent;
	options: LoadOptions;
}

export interface SaveOptions extends BaseSaveOptions {
	skipPermissionCheck?: boolean;
}

export interface SaveContentHandlerEvent {
	// We pass the models to the handler so that any db call is executed within
	// the same context. It matters in particular for transactions, which needs
	// to be executed with the same `db` connection.
	models: Models;

	// If the file being saved, is a link to another file, this `file` property
	// is a link to the **source file**.
	file: File;

	// This is the raw content, without any serialisation, and it also takes
	// into account file links.
	content: Buffer;
	options: SaveOptions;
}

export interface FileWithContent {
	file: File;
	content: FileContent;
}

export type LoadContentHandler = (event: LoadContentHandlerEvent)=> Promise<any> | null;
export type SaveContentHandler = (event: SaveContentHandlerEvent)=> Promise<File> | null;

export interface PaginatedFiles extends PaginatedResults {
	items: File[];
}

export interface PathToFileOptions {
	mustExist?: boolean;
	returnFullEntity?: boolean;
}

export interface LoadOptions {
	skipPermissionCheck?: boolean;
	fields?: string[];
	skipFollowLinks?: boolean;
}

export interface DeleteOptions extends BaseDeleteOptions {
	skipPermissionCheck?: boolean;
	deleteSource?: boolean;
}

export default class FileModel extends BaseModel<File> {

	private readonly reservedCharacters = ['/', '\\', '*', '<', '>', '?', ':', '|', '#', '%'];
	private static loadContentHandlers_: LoadContentHandler[] = [];
	private static saveContentHandlers_: SaveContentHandler[] = [];

	protected get tableName(): string {
		return 'files';
	}

	protected get trackChanges(): boolean {
		return true;
	}

	protected get itemType(): ItemType {
		return ItemType.File;
	}

	protected get hasParentId(): boolean {
		return true;
	}

	public async userRootFile(): Promise<File> {
		const file: File = await this.db<File>(this.tableName).select(...this.defaultFields).from(this.tableName).where({
			'owner_id': this.userId,
			'is_root': 1,
		}).first();
		if (file) await this.checkCanReadPermissions(file);
		return file;
	}

	public async userRootFileId(): Promise<string> {
		const r = await this.userRootFile();
		return r ? r.id : '';
	}

	private isSpecialDir(dirname: string): boolean {
		return dirname === 'root';
	}

	private async specialDirId(dirname: string): Promise<string> {
		if (dirname === 'root') return this.userRootFileId();
		return null; // Not a special dir
	}

	public async itemFullPaths(items: File[]): Promise<Record<string, string>> {
		const output: Record<string, string> = {};

		const itemCache: Record<string, File> = {};

		await this.withTransaction(async () => {
			for (const item of items) {
				const segments: string[] = [];
				let current: File = item;

				while (current) {
					if (current.is_root) break;
					segments.splice(0, 0, current.name);

					if (current.parent_id) {
						const id = current.parent_id;
						current = itemCache[id] ? itemCache[id] : await this.load(id);
						itemCache[id] = current;
					} else {
						current = null;
					}
				}

				output[item.id] = segments.length ? (`root:/${segments.join('/')}:`) : 'root';
			}
		}, 'FileModel::itemFullPaths');

		return output;
	}

	public async itemDisplayPath(item: File, loadOptions: LoadOptions = {}): Promise<string> {
		const path = await this.itemFullPath(item, loadOptions);
		return this.removeTrailingColons(path.replace(/root:\//, ''));
	}

	public async itemFullPath(item: File, loadOptions: LoadOptions = {}): Promise<string> {
		const segments: string[] = [];
		while (item) {
			if (item.is_root) break;
			segments.splice(0, 0, item.name);
			item = item.parent_id ? await this.load(item.parent_id, loadOptions) : null;
		}

		return segments.length ? (`root:/${segments.join('/')}:`) : 'root';
	}

	// Remove first and last colon from a path element
	private removeTrailingColons(path: string): string {
		return path.replace(removeTrailingColonsRegex, '$2');
	}

	public resolve(...paths: string[]): string {
		if (!paths.length) throw new Error('Path is empty');

		let pathElements: string[] = [];

		for (const p of paths) {
			pathElements = pathElements.concat(p.split('/').map(s => this.removeTrailingColons(s)));
		}

		pathElements = pathElements.filter(p => !!p);

		if (!this.isSpecialDir(pathElements[0])) throw new Error(`Path must start with a special dir: ${pathElements.join('/')}`);

		if (pathElements.length === 1) return pathElements[0];

		// If the output is just "root", we return that only. Otherwise we build the path, eg. `root:/.resource/file:'`
		const specialDir = pathElements.splice(0, 1)[0];

		return `${specialDir}:/${pathElements.join('/')}:`;
	}

	// Same as `pathToFile` but returns the ID only.
	public async pathToFileId(idOrPath: string, options: PathToFileOptions = {}): Promise<Uuid> {
		const file = await this.pathToFile(idOrPath, {
			...options,
			returnFullEntity: false,
		});
		return file ? file.id : null;
	}

	// Converts an ID such as "Ps2YtQ8Udi4eCYm1A5bLFDGhHCWWCR43" or a path such
	// as "root:/path/to/file.txt:" to the actual file.
	public async pathToFile(idOrPath: string, options: PathToFileOptions = {}): Promise<File> {
		if (!idOrPath) throw new Error('ID cannot be null');

		options = {
			mustExist: true,
			returnFullEntity: true,
			...options,
		};

		const specialDirId = await this.specialDirId(idOrPath);

		if (specialDirId) {
			return options.returnFullEntity ? this.load(specialDirId) : { id: specialDirId };
		} else if (idOrPath.indexOf(':') < 0) {
			if (options.mustExist) {
				const file = await this.load(idOrPath);
				if (!file) throw new ErrorNotFound(`file not found: ${idOrPath}`);
				return options.returnFullEntity ? file : { id: file.id };
			} else {
				return options.returnFullEntity ? this.load(idOrPath) : { id: idOrPath };
			}
		} else {
			// When this input is a path, there can be two cases:
			// - A path to an existing file - in which case we return the file
			// - A path to a file that needs to be created - in which case we
			//   return a file with all the relevant properties populated. This
			//   file might then be created by the caller.
			// The caller can check file.id to see if it's a new or existing file.
			// In both cases the directories before the filename must exist.

			const fileInfo = filePathInfo(idOrPath);
			const parentFiles = await this.pathToFiles(fileInfo.dirname);
			const parentId = parentFiles[parentFiles.length - 1].id;

			if (!fileInfo.basename) {
				const specialDirId = await this.specialDirId(fileInfo.dirname);
				// The path simply refers to a special directory. Can happen
				// for example with a path like `root:/:` (which is the same
				// as just `root`).
				if (specialDirId) return { id: specialDirId };
			}

			// This is an existing file
			const existingFile = await this.fileByName(parentId, fileInfo.basename);
			if (existingFile) return options.returnFullEntity ? existingFile : { id: existingFile.id };

			if (options.mustExist) throw new ErrorNotFound(`file not found: ${idOrPath}`);

			// This is a potentially new file
			return {
				name: fileInfo.basename,
				parent_id: parentId,
			};
		}
	}

	protected get defaultFields(): string[] {
		return Object.keys(databaseSchema[this.tableName]).filter(f => f !== 'content');
	}

	public async fileByName(parentId: string, name: string, options: LoadOptions = {}): Promise<File> {
		const file = await this.db<File>(this.tableName)
			.select(...this.defaultFields)
			.where({
				parent_id: parentId,
				name: name,
			})
			.first();

		if (!file) return null;

		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);

		return this.processFileLink(file);
	}

	protected async validate(object: File, options: ValidateOptions = {}, saveOptions: SaveOptions = {}): Promise<File> {
		const file: File = object;

		const mustBeFile = options.rules.mustBeFile === true;

		if (options.isNew) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
			if (file.is_directory && mustBeFile) throw new ErrorUnprocessableEntity('item must not be a directory');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');

			// Checking this requires loading the previous version of the file, so disable it for now
			// if ('is_directory' in file) throw new ErrorUnprocessableEntity('cannot turn a file into a directory or vice-versa');

			if (mustBeFile && !('is_directory' in file)) {
				const existingFile = await this.load(file.id);
				if (existingFile.is_directory) throw new ErrorUnprocessableEntity('item must not be a directory');
			} else {
				if (file.is_directory) throw new ErrorUnprocessableEntity('item must not be a directory');
			}
		}

		let parentId = file.parent_id;
		if (!parentId) parentId = await this.userRootFileId();

		if ('parent_id' in file && !file.is_root) {
			const invalidParentError = function(extraInfo: string) {
				let msg = `Invalid parent ID or no permission to write to it: ${parentId}`;
				if (nodeEnv !== 'production') msg += ` (${extraInfo})`;
				return new ErrorForbidden(msg);
			};

			if (!parentId) throw invalidParentError('No parent ID');

			try {
				const parentFile: File = await this.load(parentId, { skipPermissionCheck: saveOptions.skipPermissionCheck });
				if (!parentFile) throw invalidParentError('Cannot load parent file');
				if (!parentFile.is_directory) throw invalidParentError('Specified parent is not a directory');
				if (!saveOptions.skipPermissionCheck) await this.checkCanWritePermission(parentFile);
			} catch (error) {
				if (error.message.indexOf('Invalid parent') === 0) throw error;
				throw invalidParentError(`Unknown: ${error.message}`);
			}
		}

		if ('name' in file && !file.is_root) {
			const existingFile = await this.fileByName(parentId, file.name, { skipPermissionCheck: saveOptions.skipPermissionCheck });
			if (existingFile && options.isNew) throw new ErrorConflict(`Already a file with name "${file.name}" (1)`);
			if (existingFile && file.id !== existingFile.id) throw new ErrorConflict(`Already a file with name "${file.name}" (2)`);
		}

		if ('name' in file) {
			if (this.includesReservedCharacter(file.name)) throw new ErrorUnprocessableEntity(`File name may not contain any of these characters: ${this.reservedCharacters.join('')}: ${file.name}`);
		}

		return file;
	}

	public fromApiInput(object: File): File {
		const file: File = {};

		if ('id' in object) file.id = object.id;
		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;
		if ('mime_type' in object) file.mime_type = object.mime_type;
		if ('is_directory' in object) file.is_directory = object.is_directory;

		return file;
	}

	public toApiOutput(object: any): any {
		if (Array.isArray(object)) {
			return object.map(f => this.toApiOutput(f));
		} else {
			const output: File = { ...object };
			delete output.content;
			return output;
		}
	}

	public async createRootFile(): Promise<File> {
		const existingRootFile = await this.userRootFile();
		if (existingRootFile) throw new Error(`User ${this.userId} has already a root file`);

		const id = uuidgen();

		return this.save({
			id: id,
			is_directory: 1,
			is_root: 1,
			name: id, // Name must be unique so we set it to the ID
		}, {
			isNew: true,
			trackChanges: false, // Root file always exist and never changes so we don't want any change event being generated
		});
	}

	private async checkCanReadOrWritePermissions(methodName: 'canRead' | 'canWrite', file: File | File[]): Promise<void> {
		const files = Array.isArray(file) ? file : [file];

		if (!files.length || !files[0]) throw new ErrorNotFound();

		const fileIds = files.map(f => {
			if (!f.id) throw new Error('One of the file is missing an ID');
			return f.id;
		});

		const permissionModel = this.models().permission();
		const permissionGrantedMap = await permissionModel[methodName](fileIds, this.userId);

		for (const file of files) {
			if (file.owner_id === this.userId) permissionGrantedMap[file.id] = true;
		}

		for (const fileId in permissionGrantedMap) {
			if (!permissionGrantedMap[fileId]) throw new ErrorForbidden(`User ${this.userId} has no "${methodName}" access to: ${fileId}`);
		}
	}

	private async checkCanReadPermissions(file: File | File[]): Promise<void> {
		await this.checkCanReadOrWritePermissions('canRead', file);
	}

	private async checkCanWritePermission(file: File): Promise<void> {
		await this.checkCanReadOrWritePermissions('canWrite', file);
	}

	private includesReservedCharacter(path: string): boolean {
		return this.reservedCharacters.some(c => path.indexOf(c) >= 0);
	}

	public async fileUrl(idOrPath: string, query: any = null): Promise<string> {
		const file: File = await this.pathToFile(idOrPath);
		const contentSuffix = !file.is_directory ? '/content' : '';
		return setQueryParameters(`${this.baseUrl}/files/${await this.itemFullPath(file)}${contentSuffix}`, query);
	}

	private async pathToFiles(path: string, mustExist: boolean = true): Promise<File[]> {
		const filenames = splitItemPath(path);
		const output: File[] = [];
		let parent: File = null;

		for (let i = 0; i < filenames.length; i++) {
			const filename = filenames[i];
			let file: File = null;
			if (i === 0) {
				// For now we only support "root" as a root component, but potentially it could
				// be any special directory like "documents", "pictures", etc.
				if (filename !== 'root') throw new ErrorBadRequest(`unknown path root component: ${filename}`);
				file = await this.userRootFile();
			} else {
				file = await this.fileByName(parent.id, filename);
			}

			if (!file && mustExist) throw new ErrorNotFound(`file not found: "${filename}" on parent "${parent ? parent.name : ''}"`);

			output.push(file);
			parent = { ...file };
		}

		if (!output.length && mustExist) throw new ErrorBadRequest(`path without a base directory: ${path}`);

		return output;
	}

	private async processFileLink(file: File): Promise<File> {
		const files = await this.processFileLinks([file]);
		return files[0];
	}

	// If the file is a link to another file, the content of the source if
	// assigned to the content of the destination. The updated_time property is
	// also set to the most recent one among the source and the dest.
	private async processFileLinks(files: File[]): Promise<File[]> {
		const sourceFileIds: Uuid[] = [];

		for (const file of files) {
			if (!('source_file_id' in file)) throw new Error('Cannot process file links without a "source_file_id" property');
			if (!file.source_file_id) continue;
			sourceFileIds.push(file.source_file_id);
		}

		if (!sourceFileIds.length) return files;

		const fields = Object.keys(files[0]);
		const sourceFiles = await this.loadByIds(sourceFileIds, {
			fields,
			skipPermissionCheck: true,
			// Current we don't follow links more than one level deep. In
			// practice it means that if a user tries to share a note that has
			// been shared with them, it will not work. Instead they'll have to
			// make a copy of that note and share that. Anything else would
			// probably be too complex to make any sense in terms of UI.
			skipFollowLinks: true,
		});

		const modFiles = files.slice();
		for (let i = 0; i < modFiles.length; i++) {
			const file = modFiles[i];
			if (!file.source_file_id) continue;
			const sourceFile = sourceFiles.find(f => f.id === file.source_file_id);
			if (!sourceFile) {
				throw new Error(`File is linked to a file that no longer exists: ${file.id} => ${file.source_file_id}`);
			}

			const modFile = { ...file };

			if ('updated_time' in modFile) modFile.updated_time = Math.max(sourceFile.updated_time, file.updated_time);
			if ('content' in modFile) modFile.content = sourceFile.content;

			modFiles[i] = modFile;
		}

		return modFiles;
	}

	public async fileIdsByContentIds(contentIds: Uuid[]): Promise<File[]> {
		return this.db(this.tableName).select(['id', 'content_id', 'name']).whereIn('content_id', contentIds);
	}

	public async content(file: string | File, serialized: boolean = true): Promise<FileContent> {
		if (typeof file === 'string') {
			file = (await this.db<File>(this.tableName).select(['content_id', 'source_file_id', 'content_type', 'content']).where({ id: file }).first()) as File;
		}

		if (!('source_file_id' in file)) throw new Error('Cannot process file links without a "source_file_id" property');

		if (file.source_file_id) {
			file = await this.loadAllFields(file.source_file_id);
		}

		if (file.content_type === FileContentType.Any) {
			return file.content;
		} else if (file.content_type === FileContentType.JoplinItem) {
			if (!file.content_id) throw new Error('file.content_id not set');
			const content = await this.models().joplinFileContent().load(file.content_id);

			if (serialized) {
				const unserialized = await FileModel.processLoadContentHandlers({
					models: this.models(),
					file: file,
					content: content,
					options: {},
				});

				if (unserialized === null) throw new Error(`No handler to unserialize content for file ${file.id}`);

				return unserialized;
			} else {
				return content;
			}
		} else {
			throw new Error(`Unsupported content type: ${file.content_type}`);
		}
	}

	public async contentTypeInfo(fileId: string): Promise<File> {
		const file: File = await this.db<File>(this.tableName).select(['source_file_id', 'content_type', 'content_id']).where({ id: fileId }).first();
		if (!file) throw new ErrorNotFound(`No such file: ${fileId}`);
		if (file.source_file_id) return this.contentTypeInfo(file.source_file_id);
		return file;
	}

	private async loadAllFields(id: string): Promise<File> {
		return this.db<File>(this.tableName).select('*').where({ id: id }).first();
	}

	public async loadWithContent(id: string, options: LoadOptions = {}): Promise<FileWithContent | null> {
		const file: File = await this.loadAllFields(id);
		if (!file) return null;
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);

		return {
			file,
			content: await this.content(file),
		};
	}

	public async loadByIds(ids: string[], options: LoadOptions = {}): Promise<File[]> {
		const files: File[] = await super.loadByIds(ids, options);
		if (!files.length) return [];
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(files);
		return options.skipFollowLinks ? files : this.processFileLinks(files);
	}

	public async load(id: string, options: LoadOptions = {}): Promise<File> {
		const files = await this.loadByIds([id], options);
		return files.length ? files[0] : null;
	}

	public static registerSaveContentHandler(handler: SaveContentHandler) {
		this.saveContentHandlers_.push(handler);
	}

	public static registerLoadContentHandler(handler: LoadContentHandler) {
		this.loadContentHandlers_.push(handler);
	}

	private static async processSaveContentHandlers(event: SaveContentHandlerEvent): Promise<File> | null {
		for (const handler of this.saveContentHandlers_) {
			const result = await handler(event);
			if (result) return result;
		}
		return null;
	}

	private static async processLoadContentHandlers(event: LoadContentHandlerEvent): Promise<any> | null {
		for (const handler of this.loadContentHandlers_) {
			const result = await handler(event);
			if (result) return result;
		}
		return null;
	}

	public async createLink(sourceFile: File): Promise<File> {
		const rootId = await this.models().file({ userId: this.userId }).userRootFileId();

		return this.save({
			owner_id: this.userId,
			source_file_id: sourceFile.id,
			parent_id: rootId,
			name: sourceFile.name,
		});
	}

	public async save(object: File, options: SaveOptions = {}): Promise<File> {
		const isNew = await this.isNew(object, options);

		const file: File = { ... object };
		let sourceFile: File = null;

		if ('content' in file) {
			let sourceFileId: string = null;

			if (file.id) {
				if (!('source_file_id' in file)) throw new Error('source_file_id is required when setting the content');
				sourceFileId = file.source_file_id;
			}

			const fileSize = file.content ? file.content.byteLength : 0;

			if (sourceFileId) {
				sourceFile = await this.load(sourceFileId, { skipPermissionCheck: true });
				sourceFile.content = file.content;
				sourceFile.size = fileSize;

				delete file.content;
			} else {
				file.size = file.content ? file.content.byteLength : 0;
			}
		}

		if (isNew) {
			if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

			// Even if there's no content, set the mime type based on the extension
			if (!file.is_directory) file.mime_type = mimeUtils.fromFilename(file.name);

			// Make sure it's not NULL, which is not allowed
			if (!file.mime_type) file.mime_type = '';

			file.owner_id = this.userId;

			if (!file.content_id) file.content_id = '';
		}

		return this.withTransaction<File>(async () => {
			const fileToProcess = sourceFile || file;

			if ('content' in fileToProcess) {
				const fileToProcessSaveOptions = { ...options };

				// If what we are processing is the source file, then we need to
				// remove the "isNew" flag, because that source file already
				// exists.
				if (sourceFile) delete fileToProcessSaveOptions.isNew;

				const processedFile = await FileModel.processSaveContentHandlers({
					models: this.models(),
					file: fileToProcess,
					content: fileToProcess.content,
					options: fileToProcessSaveOptions,
				});

				if (processedFile) {
					if (sourceFile) {
						// If we passed the source file to the processor, then
						// we still need to save the linked file.
						return super.save(file, options);
					} else {
						// If we passed the actual file (not the source) to the
						// processor, then it has already been saved and we can
						// exit.
						return processedFile;
					}
				}
			}

			if (sourceFile) {
				await this.save(sourceFile, { ...options, skipPermissionCheck: true });
			}

			return super.save(file, options);
		});
	}

	public async childrenCount(id: string): Promise<number> {
		const parent = await this.load(id);
		await this.checkCanReadPermissions(parent);
		const r: any = await this.db(this.tableName).where('parent_id', id).count('id', { as: 'total' }).first();
		return r.total;
	}

	public async childrens(id: string, pagination: Pagination): Promise<PaginatedFiles> {
		const parent = await this.load(id);
		await this.checkCanReadPermissions(parent);
		const page = await paginateDbQuery(this.db(this.tableName).select(...this.defaultFields).where('parent_id', id), pagination);
		page.items = await this.processFileLinks(page.items);
		return page;
	}

	private async childrenIds(id: string): Promise<string[]> {
		const output = await this.db(this.tableName).select('id').where('parent_id', id);
		return output.map(r => r.id);
	}

	public async deleteChildren(id: string): Promise<void> {
		const file: File = await this.load(id);
		if (!file) return;
		await this.checkCanWritePermission(file);
		if (!file.is_directory) throw new ErrorBadRequest(`Not a directory: ${id}`);

		await this.withTransaction(async () => {
			const childrenIds = await this.childrenIds(file.id);
			for (const childId of childrenIds) {
				await this.delete(childId);
			}
		}, 'FileModel::deleteChildren');
	}

	private async linkedFileIds(sourceFileId: Uuid): Promise<Uuid[]> {
		const files: File[] = await this.db(this.tableName).select('id').where('source_file_id', '=', sourceFileId);
		return files.map(f => f.id);
	}

	// Note that unlike in a filesystem, when a link to a file is deleted, the
	// source file is deleted too. And when a source file is deleted, all its
	// links are deleted too. This makes sense for notebooks and notes because
	// if a note is deleted in a shared notebooks, we want it to be deleted for
	// all users.
	public async delete(id: string, options: DeleteOptions = {}): Promise<void> {
		options = {
			deleteSource: true,
			...options,
		};

		const file: File = await this.load(id, { skipPermissionCheck: !!options.skipPermissionCheck });
		if (!file) return;
		if (!options.skipPermissionCheck) await this.checkCanWritePermission(file);

		const canDeleteRoot = !!options.validationRules && !!options.validationRules.canDeleteRoot;

		if (id === await this.userRootFileId() && !canDeleteRoot) throw new ErrorForbidden('the root directory may not be deleted');

		if (file.source_file_id && options.deleteSource) {
			await this.delete(file.source_file_id, { skipPermissionCheck: true });
			return;
		}

		const linkedFileIds = await this.linkedFileIds(id);

		await this.withTransaction(async () => {
			await this.models().permission().deleteByFileId(id);

			if (file.is_directory) {
				const childrenIds = await this.childrenIds(file.id);
				for (const childId of childrenIds) {
					await this.delete(childId);
				}
			}

			if (file.content_id) {
				await this.models().joplinFileContent().delete(file.content_id);
			}

			if (linkedFileIds.length) {
				for (const linkedFileId of linkedFileIds) {
					await this.delete(linkedFileId, { skipPermissionCheck: true, deleteSource: false });
				}
			}

			await super.delete(id);
		}, 'FileModel::delete');
	}

}
