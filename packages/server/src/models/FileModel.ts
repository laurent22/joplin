import BaseModel, { ValidateOptions, SaveOptions, DeleteOptions } from './BaseModel';
import { File, ItemType, databaseSchema, Uuid } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound, ErrorBadRequest, ErrorConflict } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import { splitItemPath, filePathInfo } from '../utils/routeUtils';
import { paginateDbQuery, PaginatedResults, Pagination } from './utils/pagination';
import { setQueryParameters } from '../utils/urlUtils';

const mimeUtils = require('@joplin/lib/mime-utils.js').mime;

const nodeEnv = process.env.NODE_ENV || 'development';

const removeTrailingColonsRegex = /^(:|)(.*?)(:|)$/;

export interface PaginatedFiles extends PaginatedResults {
	items: File[];
}

export interface PathToFileOptions {
	mustExist?: boolean;
	returnFullEntity?: boolean;
}

export interface LoadOptions {
	skipPermissionCheck?: boolean;
}

export default class FileModel extends BaseModel<File> {

	private readonly reservedCharacters = ['/', '\\', '*', '<', '>', '?', ':', '|', '#', '%'];

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
		const file = await this.db<File>(this.tableName).select(...this.defaultFields).where({
			parent_id: parentId,
			name: name,
		}).first();

		if (!file) return null;

		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);

		return file;
	}

	protected async validate(object: File, options: ValidateOptions = {}): Promise<File> {
		const file: File = object;

		const mustBeFile = options.rules.mustBeFile === true;

		if (options.isNew) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
			if (file.is_directory && mustBeFile) throw new ErrorUnprocessableEntity('item must not be a directory');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
			if ('is_directory' in file) throw new ErrorUnprocessableEntity('cannot turn a file into a directory or vice-versa');

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
				const parentFile: File = await this.load(parentId);
				if (!parentFile) throw invalidParentError('Cannot load parent file');
				if (!parentFile.is_directory) throw invalidParentError('Specified parent is not a directory');
				await this.checkCanWritePermission(parentFile);
			} catch (error) {
				if (error.message.indexOf('Invalid parent') === 0) throw error;
				throw invalidParentError(`Unknown: ${error.message}`);
			}
		}

		if ('name' in file && !file.is_root) {
			const existingFile = await this.fileByName(parentId, file.name);
			if (existingFile && options.isNew) throw new ErrorConflict(`Already a file with name "${file.name}"`);
			if (existingFile && file.id === existingFile.id) throw new ErrorConflict(`Already a file with name "${file.name}"`);
		}

		if ('name' in file) {
			if (this.includesReservedCharacter(file.name)) throw new ErrorUnprocessableEntity(`File name may not contain any of these characters: ${this.reservedCharacters.join('')}`);
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

		const fileIds = files.map(f => f.id);

		const permissionModel = this.models().permission();
		const permissionGrantedMap = await permissionModel[methodName](fileIds, this.userId);

		for (const file of files) {
			if (file.owner_id === this.userId) permissionGrantedMap[file.id] = true;
		}

		for (const fileId in permissionGrantedMap) {
			if (!permissionGrantedMap[fileId]) throw new ErrorForbidden(`No read access to: ${fileId}`);
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
		return setQueryParameters(`${this.baseUrl}/files/${await this.itemFullPath(file)}`, query);
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

	// Mostly makes sense for testing/debugging because the filename would
	// have to globally unique, which is not a requirement.
	public async loadByName(name: string, options: LoadOptions = {}): Promise<File> {
		const file: File = await this.db(this.tableName)
			.select(this.defaultFields)
			.where({ name: name })
			.andWhere({ owner_id: this.userId })
			.first();
		if (!file) throw new ErrorNotFound(`No such file: ${name}`);
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);
		return file;
	}

	public async loadWithContent(id: string, options: LoadOptions = {}): Promise<any> {
		const file: File = await this.db<File>(this.tableName).select('*').where({ id: id }).first();
		if (!file) return null;
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);
		return file;
	}

	public async loadByIds(ids: string[], options: LoadOptions = {}): Promise<File[]> {
		const files: File[] = await super.loadByIds(ids);
		if (!files.length) return [];
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(files);
		return files;
	}

	public async load(id: string, options: LoadOptions = {}): Promise<File> {
		const file: File = await super.load(id);
		if (!file) return null;
		if (!options.skipPermissionCheck) await this.checkCanReadPermissions(file);
		return file;
	}

	public async save(object: File, options: SaveOptions = {}): Promise<File> {
		const isNew = await this.isNew(object, options);

		const file: File = { ... object };

		if ('content' in file) file.size = file.content ? file.content.byteLength : 0;

		if (isNew) {
			if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

			// Even if there's no content, set the mime type based on the extension
			if (!file.is_directory) file.mime_type = mimeUtils.fromFilename(file.name);

			// Make sure it's not NULL, which is not allowed
			if (!file.mime_type) file.mime_type = '';

			file.owner_id = this.userId;
		}

		return super.save(file, options);
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
		return paginateDbQuery(this.db(this.tableName).select(...this.defaultFields).where('parent_id', id), pagination);
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

	public async delete(id: string, options: DeleteOptions = {}): Promise<void> {
		const file: File = await this.load(id);
		if (!file) return;
		await this.checkCanWritePermission(file);

		const canDeleteRoot = !!options.validationRules && !!options.validationRules.canDeleteRoot;

		if (id === await this.userRootFileId() && !canDeleteRoot) throw new ErrorForbidden('the root directory may not be deleted');

		await this.withTransaction(async () => {
			await this.models().permission().deleteByFileId(id);

			if (file.is_directory) {
				const childrenIds = await this.childrenIds(file.id);
				for (const childId of childrenIds) {
					await this.delete(childId);
				}
			}

			await super.delete(id);
		}, 'FileModel::delete');
	}

}
