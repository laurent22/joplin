import Setting, { SyncStartupOperation } from '../../../models/Setting';
import { clearLocalDataForRedownload, clearLocalSyncStateForReupload } from '../tools';
import { reg } from '../../../registry';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('handleSyncStartupOperation');

export default async function() {
	logger.info('Processing operation:', Setting.value('sync.startupOperation'));

	if (Setting.value('sync.startupOperation') === SyncStartupOperation.ClearLocalSyncState) {

		await clearLocalSyncStateForReupload(reg.db());
		Setting.setValue('sync.startupOperation', SyncStartupOperation.None);

	} else if (Setting.value('sync.startupOperation') === SyncStartupOperation.ClearLocalData) {

		await clearLocalDataForRedownload(reg.db());
		Setting.setValue('sync.startupOperation', SyncStartupOperation.None);

	} else if (Setting.value('sync.startupOperation') === SyncStartupOperation.None) {
		// Nothing
	} else {
		throw new Error(`Invalid sync.startupOperation value: ${Setting.value('sync.startupOperation')}`);
	}
}
