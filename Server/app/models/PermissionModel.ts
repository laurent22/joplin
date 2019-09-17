import BaseModel from './BaseModel';
import db, { Permission } from '../db';

export default class PermissionModel extends BaseModel {

	static tableName():string {
		return 'permissions';
	}

	static async filePermissions(fileId:string, userId:string = null):Promise<Array<Permission>> {
		const p:Permission = {
			file_id: fileId,
		};

		if (userId) p.user_id = userId;

		return db<Permission>(this.tableName()).where(p).select();
	}

	static async canWrite(fileId:string, userId:string):Promise<boolean> {
		const permissions = await this.filePermissions(fileId, userId);
		for (const p of permissions) {
			if (p.can_write || p.is_owner) return true;
		}
		return false;
	}

}
