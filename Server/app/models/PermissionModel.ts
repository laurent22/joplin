import BaseModel from './BaseModel';
import { Permission, ItemType } from '../db';

export default class PermissionModel extends BaseModel {

	tableName():string {
		return 'permissions';
	}

	async filePermissions(fileId:string, userId:string = null):Promise<Array<Permission>> {
		const p:Permission = {
			item_type: ItemType.File,
			item_id: fileId,
		};

		if (userId) p.user_id = userId;

		return this.db<Permission>(this.tableName()).where(p).select();
	}

	async canRead(fileId:string, userId:string):Promise<boolean> {
		if (!userId || !fileId) return false;
		const permissions = await this.filePermissions(fileId, userId);
		for (const p of permissions) {
			if (p.can_read || p.is_owner) return true;
		}
		return false;
	}

	async canWrite(fileId:string, userId:string):Promise<boolean> {
		if (!userId || !fileId) return false;
		const permissions = await this.filePermissions(fileId, userId);
		for (const p of permissions) {
			if (p.can_write || p.is_owner) return true;
		}
		return false;
	}

}
