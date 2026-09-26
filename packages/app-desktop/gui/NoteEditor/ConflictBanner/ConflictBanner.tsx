import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import BannerContent from '../WarningBanner/BannerContent';
import { ConflictStaleReason } from '../utils/useConflictTitle';

interface Props {
	visible: boolean;
	reason: ConflictStaleReason;
	loadFailed?: boolean;
	onReload: ()=> void;
}

// Stays until the merge is rebuilt, so the user doesn't resolve against old data.
const ConflictBanner: React.FC<Props> = ({ visible, reason, loadFailed, onReload }) => {
	const trashed = !loadFailed && reason === ConflictStaleReason.Trashed;

	const message = () => {
		if (loadFailed) return _('This conflict could not be loaded, so your version is not shown. Reload the note to try again.');
		if (trashed) return _('The note this conflict belongs to is in the trash. Restore it to finish resolving the conflict.');
		return _('This note changed elsewhere while you were resolving it. Reload to see the latest changes.');
	};

	return (
		<BannerContent
			visible={visible || !!loadFailed}
			acceptMessage={trashed ? undefined : _('Reload')}
			onAccept={trashed ? undefined : onReload}
		>
			{message()}
		</BannerContent>
	);
};

export default ConflictBanner;
