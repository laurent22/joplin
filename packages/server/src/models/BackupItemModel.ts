import { Day } from '@joplin/utils/time';
import { BackupItem, BackupItemType } from '../services/database/types';
import BaseModel from './BaseModel';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('BackupItemModel');

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async add(type: BackupItemType, key: string, content: any, userId = ''): Promise<BackupItem> {
		const item: BackupItem = {
			user_id: userId,
			key,
			type,
			content,
		};

		return this.save(item);
	}

	public async deleteOldAccountBackups() {
		const cutOffDate = Date.now() - 90 * Day;
		const deletedCount = await this
			.db(this.tableName)
			.where('type', '=', BackupItemType.UserAccount)
			.where('created_time', '<', cutOffDate)
			.delete();
		logger.info('Deleted', deletedCount, 'archived account record(s)');
	}

}
