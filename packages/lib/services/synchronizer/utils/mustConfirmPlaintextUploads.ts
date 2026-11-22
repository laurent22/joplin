import Setting from '../../../models/Setting';
import { getEncryptionEnabled } from '../syncInfoUtils';

const mustConfirmPlaintextUploads = () => {
	return getEncryptionEnabled() && !Setting.value('encryption.allowUnencryptedUploads');
};

export default mustConfirmPlaintextUploads;
