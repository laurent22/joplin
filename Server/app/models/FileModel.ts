import BaseModel, { ValidateOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';

const nodeEnv = process.env.NODE_ENV || 'development';

export default class FileModel extends BaseModel {

	tableName():string {
		return 'files';
	}

	async userRootFile(userId:string):Promise<File> {
		const r = await this.db(this.tableName()).select('files.id').from(this.tableName()).leftJoin('permissions', 'permissions.item_id', 'files.id').where({
			'item_type': ItemType.File,
			'user_id': userId,
			'is_root': 1,
		}).first();

		if (!r) return null;

		return this.load(r.id);
	}

	async userRootFileId(userId:string):Promise<string> {
		const r = await this.userRootFile(userId);
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

	async validate(object:any, options:ValidateOptions = {}):Promise<any> {
		const file:File = object;

		if (options.isCreation) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		}

		if ('parent_id' in file && !file.is_root) {
			if (!options.userId) throw new ErrorUnprocessableEntity('User ID must be set when changing the parent');
			let parentId = file.parent_id;
			if (!parentId) parentId = await this.userRootFileId(options.userId);
			await this.checkUserCanUseParent(options.userId, parentId);
		}

		return file;
	}

	async objectToEntity(object:any, options:ValidateOptions = {}):Promise<any> {
		const file:File = {};

		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;

		return this.validate(file, options);
	}

	async createRootFile(ownerId:string):Promise<File> {
		const existingRootFile = await this.userRootFile(ownerId);
		if (existingRootFile) throw new Error(`User ${ownerId} has already a root file`);

		return this.createFile(ownerId, {
			is_directory: 1,
			is_root: 1,
			name: '',
		});
	}

	private async checkUserCanUseParent(userId:string, parentId:string):Promise<void> {
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

		const canWrite:boolean = await permissionModel.canWrite(parentId, userId);
		if (!canWrite) throw invalidParentError('Cannot write to file');
	}

	// async save<T>(object:T, options:SaveOptions = {}):Promise<T> {
	// 	const txIndex = await this.startTransaction();

	// 	let newFile:File = { ... file };
	// 	let parentId = newFile.parent_id;

	// 	try {
	// 		if (!newFile.parent_id && !newFile.is_root) newFile.parent_id = await this.userRootFileId(ownerId);

	// 		newFile = await this.validate(newFile, { isCreation: true, userId: ownerId });
	// 		newFile = await this.save(newFile);

	// 		let permission:Permission = {
	// 			user_id: ownerId,
	// 			is_owner: 1,
	// 			item_type: ItemType.File,
	// 			item_id: newFile.id,
	// 			can_read: 1,
	// 			can_write: 1,
	// 		};

	// 		const permissionModel = new PermissionModel();

	// 		await permissionModel.save(permission);
	// 	} catch (error) {
	// 		await this.rollbackTransaction(txIndex);
	// 		throw error;
	// 	}

	// 	await this.commitTransaction(txIndex);

	// 	return newFile;
	// }


	// In order to create a file, we need a parent_id. If `file` has this property set, use that.
	// If not, use the user's root file ID.
	async createFile(ownerId:string, file:File):Promise<File> {
		const txIndex = await this.startTransaction();

		let newFile:File = { ... file };

		try {
			if (!newFile.parent_id && !newFile.is_root) newFile.parent_id = await this.userRootFileId(ownerId);

			newFile = await this.validate(newFile, { isCreation: true, userId: ownerId });
			newFile = await this.save(newFile);

			let permission:Permission = {
				user_id: ownerId,
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

	// async updateFile(file:File) {
	// 	file = {...file}

	// 	if ('parent_id' in file) {
	// 		let parentId = file.parent_id;
	// 		const ownerId = await this.fileOwnerId(file.id);
	// 		if (!parentId) parentId = await this.userRootFileId(ownerId);
	// 		await this.checkUserCanUseParent(ownerId, parentId);
	// 		file.parent_id = parentId;
	// 	}

	// 	return this.save(file);
	// }

}
