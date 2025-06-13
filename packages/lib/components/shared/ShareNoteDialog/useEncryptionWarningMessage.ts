import { _ } from '../../../locale';
import { getEncryptionEnabled } from '../../../services/synchronizer/syncInfoUtils';

const useEncryptionWarningMessage = () => {
	if (!getEncryptionEnabled()) return null;
	return _('Note: When a note is shared, it will no longer be encrypted on the server.');
};

export default useEncryptionWarningMessage;
