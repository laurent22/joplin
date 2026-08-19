import { _, _n } from '../../../locale';
import shim from '../../../shim';
import { SharingStatus } from './types';

interface Props {
	sharesState: SharingStatus;
	noteCount: number;
}

const useShareStatusMessage = ({ sharesState, noteCount }: Props): string => {
	if (sharesState === SharingStatus.Synchronizing) {
		return _('Synchronising...');
	}
	if (sharesState === SharingStatus.Creating) {
		return _n('Generating link...', 'Generating links...', noteCount);
	}
	if (sharesState === SharingStatus.Created) {
		// On web, copying text after a long delay (e.g. to sync) fails.
		// As such, the web UI for copying links is a bit different:
		if (shim.mobilePlatform() === 'web') {
			return _n('Link created!', 'Links created!', noteCount);
		} else {
			return _n('Link has been copied to clipboard!', 'Links have been copied to clipboard!', noteCount);
		}
	}
	return '';
};

export default useShareStatusMessage;
