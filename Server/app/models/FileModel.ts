import BaseModel from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';
import { ErrorForbidden } from '../utils/errors';

const nodeEnv = process.env.NODE_ENV || 'development';

export interface CreateFileOptions {
	skipPermissionChecks?: boolean
}

export default class FileModel extends BaseModel {

	tableName():string {
		return 'files';
	}

	async userRootFile(userId:string):Promise<File> {
		const r = await this.db(this.tableName()).select('files.id').from(this.tableName()).leftJoin('permissions', 'permissions.item_id', 'files.id').where({
			'item_type': ItemType.File,
			'parent_id': '',
			'user_id': userId,
			'is_directory': 1,
		}).first();

		if (!r) return null;

		return this.load(r.id);
	}

	async userRootFileId(userId:string):Promise<string> {
		const r = await this.userRootFile(userId);
		return r ? r.id : '';
	}

	async createRootFile(ownerId:string):Promise<File> {
		const existingRootFile = await this.userRootFile(ownerId);
		if (existingRootFile) throw new Error(`User ${ownerId} has already a root file`);

		return this.createFile(ownerId, {
			is_directory: 1,
			name: '',
		}, { skipPermissionChecks: true });
	}

	// In order to create a file, we need a parent_id. If `file` has this property set, use that.
	// If not, use the user's root file ID.
	async createFile(ownerId:string, file:File, options:CreateFileOptions = {}):Promise<File> {
		const txIndex = await this.startTransaction();

		let newFile:File = { ... file };
		let parentId = newFile.parent_id;

		try {
			if (!parentId) parentId = await this.userRootFileId(ownerId);

			if (options.skipPermissionChecks !== true) {

				const invalidParentError = function(extraInfo:string) {
					let msg = `Invalid parent ID or no permission to write to it: ${parentId}`;
					if (nodeEnv !== 'production') msg += ` (${extraInfo})`;
					return new ErrorForbidden(msg);
				};

				if (!parentId) throw invalidParentError('No parent ID');

				let parentFile:File;
				try {
					parentFile = await this.load(parentId);
					if (!parentFile) throw invalidParentError('Cannot load parent file');
				} catch (error) {
					if (error.message.indexOf('Invalid parent') === 0) throw error;
					throw invalidParentError(`Unknown: ${error.message}`);
				}

				const permissionModel = new PermissionModel();

				const canWrite:boolean = await permissionModel.canWrite(parentFile.id, ownerId);
				if (!canWrite) throw invalidParentError('Cannot write to file');
			}

			newFile.parent_id = parentId;

			newFile = await this.save(newFile);

			let permission:Permission = {
				user_id: ownerId,
				is_owner: 1,
				item_type: ItemType.File,
				item_id: newFile.id,
				can_read: 1,
				can_write: 1,
			};

			const permissionModel = new PermissionModel(this.dbOptions);

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
