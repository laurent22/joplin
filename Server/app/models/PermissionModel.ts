import BaseModel from './BaseModel';
import { Permission, ItemType, User } from '../db';
import UserModel from './UserModel';

enum ReadOrWriteKeys {
	CanRead = 'can_read',
	CanWrite = 'can_write',
}

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

	private async canReadOrWrite(fileId:string, userId:string, method:ReadOrWriteKeys):Promise<boolean> {
		if (!userId || !fileId) return false;
		const permissions = await this.filePermissions(fileId, userId);
		for (const p of permissions) {
			if (p[method] || p.is_owner) return true;
		}

		const userModel = new UserModel({ userId: userId });
		const owner:User = await userModel.load(userId);
		if (owner.is_admin) return true;

		return false;
	}

	async canRead(fileId:string, userId:string):Promise<boolean> {
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanRead);
		// if (!userId || !fileId) return false;
		// const permissions = await this.filePermissions(fileId, userId);
		// for (const p of permissions) {
		// 	if (p.can_read || p.is_owner) return true;
		// }
		// return false;
	}

	async canWrite(fileId:string, userId:string):Promise<boolean> {
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanWrite);
		// if (!userId || !fileId) return false;
		// const permissions = await this.filePermissions(fileId, userId);
		// for (const p of permissions) {
		// 	if (p.can_write || p.is_owner) return true;
		// }

		// const userModel = new UserModel({ userId: userId });
		// const owner:User = await userModel.load(userId);
		// if (owner.is_admin) return true;

		// return false;
	}

	async deleteByFileId(fileId:string):Promise<void> {
		const permissions = await this.filePermissions(fileId);
		const ids = permissions.map(m => m.id);
		super.delete(ids);
	}

}
