import BaseModel, { ValidateOptions, SaveOptions, DeleteOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, ItemType, databaseSchema } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound, ErrorBadRequest, ErrorConflict } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import { splitItemPath, filePathInfo } from '../utils/routeUtils';

const mimeUtils = require('lib/mime-utils.js').mime;

const nodeEnv = process.env.NODE_ENV || 'development';

export interface EntityFromItemIdOptions {
	mustExist?: boolean
}

export default class FileModel extends BaseModel {

	readonly reservedCharacters = ['/', '\\', '*', '<', '>', '?', ':', '|', '#', '%'];

	get tableName():string {
		return 'files';
	}

	async userRootFile():Promise<File> {
		const file:File = await this.db<File>(this.tableName).select(...this.defaultFields).from(this.tableName).where({
			'owner_id': this.userId,
			'is_root': 1,
		}).first();
		if (file) await this.checkCanReadPermissions(file);
		return file;
	}

	async userRootFileId():Promise<string> {
		const r = await this.userRootFile();
		return r ? r.id : '';
	}

	async fileOwnerId(fileId:string):Promise<string> {
		const r = await this.db('permissions').select('permissions.user_id').where({
			'item_type': ItemType.File,
			'item_id': fileId,
			'is_owner': 1,
		}).first();

		if (!r) return null;

		return r.user_id;
	}

	async specialDirId(dirname:string):Promise<string> {
		if (dirname === 'root') return this.userRootFileId();
		return null; // Not a special dir
	}

	async entityFromItemId(idOrPath:string, options:EntityFromItemIdOptions = {}):Promise<File> {
		options = { mustExist: true, ...options };

		const specialDirId = await this.specialDirId(idOrPath);

		if (specialDirId) {
			return { id: specialDirId };
		} else if (idOrPath.indexOf(':') < 0) {
			return { id: idOrPath };
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

			// This is an existing file
			const existingFile = await this.fileByName(parentId, fileInfo.basename);
			if (existingFile) return { id: existingFile.id };

			if (options.mustExist) throw new ErrorNotFound(`file not found: ${idOrPath}`);

			// This is a potentially new file
			return {
				name: fileInfo.basename,
				parent_id: parentId,
			};
		}
	}

	get defaultFields():string[] {
		return Object.keys(databaseSchema[this.tableName]).filter(f => f !== 'content');
	}

	async allByParent(parentId:string):Promise<File[]> {
		if (!parentId) parentId = await this.userRootFileId();
		return this.db(this.tableName).select(...this.defaultFields).where({ parent_id: parentId });
	}

	async fileByName(parentId:string, name:string):Promise<File> {
		return this.db<File>(this.tableName).select(...this.defaultFields).where({
			parent_id: parentId,
			name: name,
		}).first();
	}

	async validate(object:File, options:ValidateOptions = {}):Promise<File> {
		const file:File = object;

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
			const invalidParentError = function(extraInfo:string) {
				let msg = `Invalid parent ID or no permission to write to it: ${parentId}`;
				if (nodeEnv !== 'production') msg += ` (${extraInfo})`;
				return new ErrorForbidden(msg);
			};

			if (!parentId) throw invalidParentError('No parent ID');

			try {
				const parentFile:File = await this.load(parentId);
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

	async fromApiInput(object:File):Promise<File> {
		const file:File = {};

		if ('id' in object) file.id = object.id;
		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;
		if ('mime_type' in object) file.mime_type = object.mime_type;
		if ('is_directory' in object) file.is_directory = object.is_directory;

		return file;
	}

	toApiOutput(object:any):any {
		if (Array.isArray(object)) {
			return object.map(f => this.toApiOutput(f));
		} else {
			const output:File = { ...object };
			delete output.content;
			return output;
		}
	}

	async createRootFile():Promise<File> {
		const existingRootFile = await this.userRootFile();
		if (existingRootFile) throw new Error(`User ${this.userId} has already a root file`);

		const fileModel = new FileModel({ userId: this.userId });

		const id = uuidgen();

		return fileModel.save({
			id: id,
			is_directory: 1,
			is_root: 1,
			name: id, // Name must be unique so we set it to the ID
		}, { isNew: true });
	}

	private async checkCanReadPermissions(file:File):Promise<void> {
		if (!file) throw new ErrorNotFound();
		if (file.owner_id === this.userId) return;
		const permissionModel = new PermissionModel();
		const canRead:boolean = await permissionModel.canRead(file.id, this.userId);
		if (!canRead) throw new ErrorForbidden();
	}

	private async checkCanWritePermission(file:File):Promise<void> {
		if (!file) throw new ErrorNotFound();
		if (file.owner_id === this.userId) return;
		const permissionModel = new PermissionModel();
		const canWrite:boolean = await permissionModel.canWrite(file.id, this.userId);
		if (!canWrite) throw new ErrorForbidden();
	}

	private includesReservedCharacter(path:string):boolean {
		return this.reservedCharacters.some(c => path.indexOf(c) >= 0);
	}

	private async pathToFiles(path:string, mustExist:boolean = true):Promise<File[]> {
		const filenames = splitItemPath(path);
		const output:File[] = [];
		let parent:File = null;

		for (let i = 0; i < filenames.length; i++) {
			const filename = filenames[i];
			let file:File = null;
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
			parent = {...file};
		}

		if (!output.length && mustExist) throw new ErrorBadRequest(`path without a base directory: ${path}`);

		return output;
	}

	async loadWithContent(id:string):Promise<any> {
		const file:File = await this.db<File>(this.tableName).select('*').where({ id: id }).first();
		if (!file) return null;
		await this.checkCanReadPermissions(file);
		return file;
	}

	async load(id:string):Promise<File> {
		const file:File = await super.load(id);
		if (!file) return null;
		await this.checkCanReadPermissions(file);
		return file;
	}

	async save(object:File, options:SaveOptions = {}):Promise<File> {
		const isNew = await this.isNew(object, options);

		const txIndex = await this.startTransaction();

		let file:File = { ... object };

		try {
			if ('content' in file) file.size = file.content ? file.content.byteLength : 0;

			if (isNew) {
				if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

				// Even if there's no content, set the mime type based on the extension
				if (!file.is_directory) file.mime_type = mimeUtils.fromFilename(file.name);

				// Make sure it's not NULL, which is not allowed
				if (!file.mime_type) file.mime_type = '';

				file.owner_id = this.userId;
			}

			file = await super.save(file, options);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return file;
	}

	async childrens(id:string):Promise<string[]> {
		const parent = await this.load(id);
		await this.checkCanReadPermissions(parent);
		return this.db(this.tableName).select(...this.defaultFields).where('parent_id', id);
	}

	private async childrenIds(id:string):Promise<string[]> {
		const output = await this.db(this.tableName).select('id').where('parent_id', id);
		return output.map(r => r.id);
	}

	async delete(id:string, options:DeleteOptions = {}):Promise<void> {
		const file:File = await this.load(id);
		if (!file) return;
		await this.checkCanWritePermission(file);

		const canDeleteRoot = !!options.validationRules && !!options.validationRules.canDeleteRoot;

		if (id === await this.userRootFileId() && !canDeleteRoot) throw new ErrorForbidden('the root directory may not be deleted');

		const txIndex = await this.startTransaction();

		try {
			const permissionModel = new PermissionModel();
			await permissionModel.deleteByFileId(id);

			if (file.is_directory) {
				const childrenIds = await this.childrenIds(file.id);
				for (const childId of childrenIds) {
					await this.delete(childId);
				}
			}

			await super.delete(id);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);
	}

}
