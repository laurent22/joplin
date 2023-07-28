import SyncTargetRegistry from '../SyncTargetRegistry';
import eventManager from '../eventManager';
import Setting from '../models/Setting';
import { reg } from '../registry';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('userFetcher');

interface UserApiResponse {
	inbox?: {
		jop_id: string;
	};
	inbox_email?: string;
	can_use_share_permissions?: number;
}

const userFetcher = async () => {

	if (Setting.value('sync.target') !== SyncTargetRegistry.nameToId('joplinCloud')) {
		return;
	}

	const syncTarget = reg.syncTarget();
	const fileApi = await syncTarget.fileApi();
	const api = fileApi.driver().api();

	const owner: UserApiResponse = await api.exec('GET', `api/users/${api.userId}`);

	logger.info('Got user:', owner);

	Setting.setValue('sync.10.inboxId', owner.inbox ? owner.inbox.jop_id : '');
	Setting.setValue('sync.10.inboxEmail', owner.inbox_email ? owner.inbox_email : '');
	Setting.setValue('sync.10.canUseSharePermissions', !!owner.can_use_share_permissions);
};

// Listen to the event only once
export const initializeUserFetcher = () => {
	eventManager.once('sessionEstablished', userFetcher);
};

export default userFetcher;
