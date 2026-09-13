import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import BannerContent from '../WarningBanner/BannerContent';

interface Props {
	visible: boolean;
	onReload: ()=> void;
}

// Stays until the merge is rebuilt, so the user doesn't resolve against old data.
const ConflictBanner: React.FC<Props> = ({ visible, onReload }) => {
	return (
		<BannerContent visible={visible} acceptMessage={_('Reload')} onAccept={onReload}>
			{_('This note changed elsewhere while you were resolving it. Reload to see the latest changes.')}
		</BannerContent>
	);
};

export default ConflictBanner;
