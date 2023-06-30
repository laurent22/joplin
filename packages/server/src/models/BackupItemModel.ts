import { BackupItem, BackupItemType } from '../services/database/types';
import BaseModel from './BaseModel';

export default class BackupItemModel extends BaseModel<BackupItem> {

	protected get tableName(): string {
		return 'backup_items';
	}

	protected hasUuid(): boolean {
		return false;
	}

	protected hasUpdatedTime(): boolean {
		return false;
	}

	public async add(type: BackupItemType, key: string, content: any, userId = ''): Promise<BackupItem> {
		const item: BackupItem = {
			user_id: userId,
			key,
			type,
			content,
		};

		return this.save(item);
	}

}
