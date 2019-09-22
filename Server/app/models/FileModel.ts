import BaseModel, { ValidateOptions, SaveOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound } from '../utils/errors';

const nodeEnv = process.env.NODE_ENV || 'development';

export default class FileModel extends BaseModel {

	tableName():string {
		return 'files';
	}

	async userRootFile():Promise<File> {
		const r = await this.db(this.tableName()).select('files.id').from(this.tableName()).leftJoin('permissions', 'permissions.item_id', 'files.id').where({
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

	defaultFields():string | string[] {
		return ['id', 'name', 'mime_type', 'is_directory', 'is_root', 'parent_id'];
	}

	async fileByName(parentId:string, name:string):Promise<File> {
		return this.db<File>(this.tableName()).select(this.defaultFields()).where({
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

	async objectToEntity(object:any):Promise<any> {
		const file:File = {};

		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;
		if ('mime_type' in object) file.mime_type = object.mime_type;

		return file;
	}

	async createRootFile():Promise<File> {
		const existingRootFile = await this.userRootFile();
		if (existingRootFile) throw new Error(`User ${this.userId} has already a root file`);

		const fileModel = new FileModel({ userId: this.userId });

		return fileModel.save({
			is_directory: 1,
			is_root: 1,
			name: '',
		});
	}

	async load(id:string):Promise<File> {
		const permissionModel = new PermissionModel();
		const canRead:boolean = await permissionModel.canRead(id, this.userId);
		if (!canRead) throw new ErrorNotFound(); // Return 404 for security reasons, so that user cannot test if file exists or not

		return super.load(id);
	}

	async save(object:File, options:SaveOptions = {}):Promise<File> {
		const isNew = this.isNew(object, options);

		const txIndex = await this.startTransaction();

		let file:File = { ... object };

		try {
			if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

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

	toApiOutput(object:any):any {
		const output:File = { ...object };
		delete output.content;
		return output;
	}

}
