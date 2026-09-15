import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import BannerContent from '../WarningBanner/BannerContent';
import { ConflictStaleReason } from '../utils/useConflictTitle';

interface Props {
	visible: boolean;
	reason: ConflictStaleReason;
	onReload: ()=> void;
}

// Stays until the merge is rebuilt, so the user doesn't resolve against old data.
const ConflictBanner: React.FC<Props> = ({ visible, reason, onReload }) => {
	const trashed = reason === ConflictStaleReason.Trashed;

	return (
		<BannerContent
			visible={visible}
			acceptMessage={trashed ? undefined : _('Reload')}
			onAccept={trashed ? undefined : onReload}
		>
			{trashed
				? _('The note this conflict belongs to is in the trash. Restore it to finish resolving the conflict.')
				: _('This note changed elsewhere while you were resolving it. Reload to see the latest changes.')}
		</BannerContent>
	);
};

export default ConflictBanner;
