import type { State } from '../../../reducer';
import { localSyncInfoFromState } from '../../../services/synchronizer/syncInfoUtils';
import mustConfirmPlaintextUploads from '../../../services/synchronizer/utils/mustConfirmPlaintextUploads';

// Already-published notes and notebooks can still be opened to copy their links
const isPublishBlockedByE2ee = (state: State|null = null) => {
	if (!state) return mustConfirmPlaintextUploads();
	return localSyncInfoFromState(state).e2ee && !state.settings['encryption.allowUnencryptedUploads'];
};

export default isPublishBlockedByE2ee;
