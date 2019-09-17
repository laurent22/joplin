import BaseModel from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, Permission, ItemType } from '../db';

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

	async createFile(ownerId:string, file:File):Promise<File> {
		const newFile = await this.save(file);

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

		return newFile;
	}

}
