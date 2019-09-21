import BaseModel, { ValidateOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';

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

	async validate(object:File, options:ValidateOptions = {}):Promise<File> {
		const file:File = object;

		if (options.isNew) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		}

		if ('parent_id' in file && !file.is_root) {
			let parentId = file.parent_id;
			if (!parentId) parentId = await this.userRootFileId();

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
				// TODO: Check that user owns parent directory
			} catch (error) {
				if (error.message.indexOf('Invalid parent') === 0) throw error;
				throw invalidParentError(`Unknown: ${error.message}`);
			}

			const permissionModel = new PermissionModel();

			const canWrite:boolean = await permissionModel.canWrite(parentId, this.userId);
			if (!canWrite) throw invalidParentError('Cannot write to file');
		}

		return file;
	}

	async objectToEntity(object:any, options:ValidateOptions = {}):Promise<any> {
		const file:File = {};

		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;

		return this.validate(file, options);
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

	async save(object:File):Promise<File> {
		const txIndex = await this.startTransaction();

		let newFile:File = { ... object };

		try {
			if (!newFile.parent_id && !newFile.is_root) newFile.parent_id = await this.userRootFileId();

			newFile = await super.save(newFile);

			let permission:Permission = {
				user_id: this.options.userId,
				is_owner: 1,
				item_type: ItemType.File,
				item_id: newFile.id,
				can_read: 1,
				can_write: 1,
			};

			const permissionModel = new PermissionModel();

			await permissionModel.save(permission);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return newFile;
	}

	toApiOutput(object:any):any {
		const output:File = { ...object };
		delete output.content;
		return output;
	}

}
