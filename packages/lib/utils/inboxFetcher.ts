import SyncTargetRegistry from '../SyncTargetRegistry';
import Setting from '../models/Setting';
import { reg } from '../registry';

const inboxFolderFetcher = async () => {

	if (Setting.value('sync.target') !== SyncTargetRegistry.nameToId('joplinCloud')) {
		return;
	}

	const syncTarget = reg.syncTarget();
	const fileApi = await syncTarget.fileApi();
	const api = fileApi.driver().api();

	const owner = await api.exec('GET', `api/users/${api.userId}`);

	if (owner.inbox) {
		Setting.setValue('emailToNote.inboxJopId', owner.inbox.jop_id);
	}

	if (owner.inbox_email) {
		Setting.setValue('emailToNote.inbox_email', owner.inbox_email);
	}
};

export default inboxFolderFetcher;
