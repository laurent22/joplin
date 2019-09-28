import BaseModel from './BaseModel';
import { Permission, ItemType, User } from '../db';
import UserModel from './UserModel';

enum ReadOrWriteKeys {
	CanRead = 'can_read',
	CanWrite = 'can_write',
}

export default class PermissionModel extends BaseModel {

	get tableName():string {
		return 'permissions';
	}

	async filePermissions(fileId:string, userId:string = null):Promise<Array<Permission>> {
		const p:Permission = {
			item_type: ItemType.File,
			item_id: fileId,
		};

		if (userId) p.user_id = userId;

		return this.db<Permission>(this.tableName).where(p).select();
	}

	private async canReadOrWrite(fileId:string, userId:string, method:ReadOrWriteKeys):Promise<boolean> {
		if (!userId || !fileId) return false;
		const permissions = await this.filePermissions(fileId, userId);
		for (const p of permissions) {
			if (p[method]) return true;
		}

		const userModel = new UserModel({ userId: userId });
		const user:User = await userModel.load(userId);
		if (user.is_admin) return true;

		return false;
	}

	async canRead(fileId:string, userId:string):Promise<boolean> {
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanRead);
	}

	async canWrite(fileId:string, userId:string):Promise<boolean> {
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanWrite);
	}

	async deleteByFileId(fileId:string):Promise<void> {
		const permissions = await this.filePermissions(fileId);
		if (!permissions.length) return;
		const ids = permissions.map(m => m.id);
		super.delete(ids);
	}

}
