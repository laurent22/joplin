import BaseModel, { ValidateOptions, SaveOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType, databaseSchema, ItemAddressingType, WithUuid } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound, ErrorBadRequest } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import { splitItemPath, removeFilePathPrefix, isPathBasedAddressing, filePathInfo } from '../utils/routeUtils';

const mimeUtils = require('lib/mime-utils.js').mime;

const nodeEnv = process.env.NODE_ENV || 'development';

export default class FileModel extends BaseModel {

	get tableName():string {
		return 'files';
	}

	async userRootFile():Promise<File> {
		const r = await this.db(this.tableName).select('files.id').from(this.tableName).leftJoin('permissions', 'permissions.item_id', 'files.id').where({
			'item_type': ItemType.File,
			'user_id': this.userId,
			'is_root': 1,
		}).first();

		if (!r) return null;

		return this.load(r.id);
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

	async entityFromItemId(idOrPath:string /* | ItemId */):Promise<File> {
		const file:File = {};

		if (idOrPath.indexOf(':') < 0) {
			file.id = idOrPath;
		} else {
			const fileInfo = filePathInfo(idOrPath);
			const parentFiles = await this.pathToFiles(fileInfo.dirname);
			file.name = fileInfo.basename;
			file.parent_id = parentFiles[parentFiles.length - 1].id;
		}

		return file;
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

		if (options.isNew) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
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
			} catch (error) {
				if (error.message.indexOf('Invalid parent') === 0) throw error;
				throw invalidParentError(`Unknown: ${error.message}`);
			}

			const permissionModel = new PermissionModel();

			const canWrite:boolean = await permissionModel.canWrite(parentId, this.userId);
			if (!canWrite) throw invalidParentError('Cannot write to file');
		}

		if ('name' in file && !file.is_root) {
			const existingFile = await this.fileByName(parentId, file.name);
			if (existingFile && options.isNew) throw new ErrorUnprocessableEntity(`Already a file with name "${file.name}"`);
			if (existingFile && file.id === existingFile.id) throw new ErrorUnprocessableEntity(`Already a file with name "${file.name}"`);
		}

		return file;
	}

	async fromApiInput(object:File):Promise<File> {
		const file:File = {};

		if ('id' in object) file.id = object.id;
		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;
		if ('mime_type' in object) file.mime_type = object.mime_type;

		return file;
	}

	toApiOutput(object:any):any {
		const output:File = { ...object };
		delete output.content;
		return output;
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

	private async checkCanReadPermissions(id:string):Promise<void> {
		const permissionModel = new PermissionModel();
		const canRead:boolean = await permissionModel.canRead(id, this.userId);
		if (!canRead) throw new ErrorForbidden();
	}

	// TODO: Return an interface FilePath { parents: File[], file:File, exists: boolean }
	// If any of the parents don't exist - throw
	// If
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

			if (!file && i === filenames.length - 1 && mustExist) throw new ErrorNotFound(`file not found: "${filename}" on parent "${parent ? parent.name : ''}"`);

			output.push(file);
			parent = {...file};
		}

		if (!output.length && mustExist) throw new ErrorBadRequest(`path without a base directory: ${path}`);

		return output;
	}

	async idFromItemId(id:string /* | ItemId */, mustExist:boolean = true):Promise<string> {
		if (typeof id === 'string') return id;

		// const itemId = id as ItemId;
		// if (itemId.addressingType === ItemAddressingType.Id) {
		// 	return itemId.value;
		// } else {
		// 	const files = await this.pathToFiles(itemId.value, mustExist);
		// 	if (!files.length && !mustExist) return '';
		// 	if (!files.length) throw new ErrorNotFound(`invalid path: ${itemId.value}`);
		// 	return files[files.length - 1].id;
		// }
	}

	async loadWithContent(id:string /* | ItemId */):Promise<any> {
		const idString = await this.idFromItemId(id);
		await this.checkCanReadPermissions(idString);
		const file:File = await this.db<File>(this.tableName).select('*').where({ id: idString }).first();
		return file;
	}

	async load(id:string /* | ItemId */):Promise<File> {
		const idString = await this.idFromItemId(id);
		await this.checkCanReadPermissions(idString);
		return super.load(idString);
	}

	async isNew(object:File, options:SaveOptions):Promise<boolean> {
		const id = (object as WithUuid).id;

		// TODO: Fix?

		// if (isPathBasedAddressing(id)) {
		// 	const fileInfo =
		// 	const parentFiles = await this.pathToFiles(dirname(id), false);
		// }

		return super.isNew(object, options);
	}

	async save(object:File, options:SaveOptions = {}):Promise<File> {
		const isNew = await this.isNew(object, options);

		const txIndex = await this.startTransaction();

		let file:File = { ... object };

		try {
			if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

			if ('content' in file) {
				file.size = file.content ? file.content.byteLength : 0;
				file.mime_type = mimeUtils.fromFilename(file.name);
			}

			file = await super.save(file, options);

			if (isNew) {
				const permission:Permission = {
					user_id: this.options.userId,
					is_owner: 1,
					item_type: ItemType.File,
					item_id: file.id,
					can_read: 1,
					can_write: 1,
				};

				const permissionModel = new PermissionModel();
				await permissionModel.save(permission);
			}
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return file;
	}

	async delete(id:string /* | ItemId */):Promise<void> {
		const idString = await this.idFromItemId(id);

		const permissionModel = new PermissionModel();
		const canWrite:boolean = await permissionModel.canWrite(idString, this.userId);
		if (!canWrite) throw new ErrorForbidden();

		const txIndex = await this.startTransaction();

		try {
			await permissionModel.deleteByFileId(idString);
			await super.delete(idString);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);
	}

}
