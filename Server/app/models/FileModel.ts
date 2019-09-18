import BaseModel from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';
import { ErrorForbidden } from '../utils/errors';

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

	async createRootFile(ownerId:string):Promise<File> {
		const existingRootFile = await this.userRootFile(ownerId);
		if (existingRootFile) throw new Error('User ' + ownerId + ' has already a root file');

		return this.createFile(ownerId, {
			is_directory: 1,
			name: '',
		}, { skipPermissionChecks: true });
	}

	async createFile(ownerId:string, file:File, options:CreateFileOptions = {}):Promise<File> {
		const transactionHandler = await this.transactionHandler(this.dbOptions);

		let newFile:File = null;

		try {
			if (options.skipPermissionChecks !== true) {
				const invalidParentError = new ErrorForbidden('Invalid parent ID or no permission to write to it: ' + file.parent_id);

				const fileModel = new FileModel();

				let parentFile:File;
				try {
					parentFile = await fileModel.load(file.parent_id);
					if (!parentFile) throw invalidParentError;
				} catch (error) {
					throw invalidParentError;
				}

				const permissionModel = new PermissionModel();

				const canWrite:boolean = await permissionModel.canWrite(ownerId, parentFile.id);
				if (!canWrite) throw invalidParentError;
			}

			newFile = await this.save(file);

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
			transactionHandler.onError(error);
		}

		transactionHandler.onSuccess();

		return newFile;
	}

}
