import BaseModel from './BaseModel';
import { Permission, ItemType, User, Uuid } from '../db';

enum ReadOrWriteKeys {
	CanRead = 'can_read',
	CanWrite = 'can_write',
}

// Tells whether the given item has the permission to do the required operation
// (can be read or write).
export type PermissionGrantedMap = Record<Uuid, boolean>;

export type PermissionMap = Record<Uuid, Permission[]>;

export default class PermissionModel extends BaseModel {

	protected get tableName(): string {
		return 'permissions';
	}

	private async filePermissions(fileId: string, userId: string = null): Promise<Permission[]> {
		const p = await this.filesPermissions([fileId], userId);
		return p[fileId];
	}

	private async filesPermissions(fileIds: string[], userId: string = null): Promise<PermissionMap> {
		const p: Permission = {
			item_type: ItemType.File,
		};

		if (userId) p.user_id = userId;

		const permissions: Permission[] = await this.db<Permission>(this.tableName).where(p).whereIn('item_id', fileIds).select();
		const output: PermissionMap = {};

		for (const fileId of fileIds) {
			output[fileId] = [];
		}

		for (const permission of permissions) {
			output[permission.item_id].push(permission);
		}

		return output;
	}

	private async canReadOrWrite(fileIds: string[], userId: string, method: ReadOrWriteKeys): Promise<PermissionGrantedMap> {
		const output: PermissionGrantedMap = {};

		if (!fileIds.length) throw new Error('No files specified');
		if (!userId) throw new Error('No user specified');

		const permissionMap = await this.filesPermissions(fileIds, userId);
		const userModel = this.models().user({ userId: userId });
		const user: User = await userModel.load(userId);

		for (const fileId in permissionMap) {
			const permissions = permissionMap[fileId];
			output[fileId] = !!user.is_admin || !!permissions.find(p => !!p[method]);
		}

		return output;
	}

	public async canRead(fileId: string | string[], userId: string): Promise<PermissionGrantedMap> {
		fileId = Array.isArray(fileId) ? fileId : [fileId];
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanRead);
	}

	public async canWrite(fileId: string | string[], userId: string): Promise<PermissionGrantedMap> {
		fileId = Array.isArray(fileId) ? fileId : [fileId];
		return this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanWrite);
	}

	public async deleteByFileId(fileId: string): Promise<void> {
		const permissions = await this.filePermissions(fileId);
		if (!permissions.length) return;
		const ids = permissions.map(m => m.id);
		await super.delete(ids);
	}

}
