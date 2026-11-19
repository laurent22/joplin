import { _ } from '../../../locale';
import { getEncryptionEnabled } from '../../../services/synchronizer/syncInfoUtils';
import isPublishBlockedByE2ee from './isPublishBlockedByE2ee';

const useEncryptionWarningMessage = () => {
	if (!getEncryptionEnabled()) return null;
	if (isPublishBlockedByE2ee()) {
		return _('Your notes are protected by end-to-end encryption. To publish notes, enable "Allow publishing with end-to-end encryption on" in Settings > Synchronisation.');
	}
	return _('Note: When a note is shared, it will no longer be encrypted on the server.');
};

export default useEncryptionWarningMessage;
