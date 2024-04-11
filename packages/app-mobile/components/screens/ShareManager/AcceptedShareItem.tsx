import * as React from 'react';
import { ShareInvitation } from '@joplin/lib/services/share/reducer';
import { Button, Card, Icon } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import ShareService from '@joplin/lib/services/share/ShareService';
import shim from '@joplin/lib/shim';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Folder from '@joplin/lib/models/Folder';

interface Props {
	invitation: ShareInvitation;
	processing: boolean;
}

const AcceptedIcon = (props: { size: number }) => <Icon {...props} source='account-multiple-check'/>;

const AcceptedShareItem: React.FC<Props> = props => {
	const invitation = props.invitation;
	const sharer = invitation.share.user;

	const [leaving, setLeaving] = useState(false);
	// The "leave share" button can be briefly visible after leaving a share.
	// When this is the case, keep track of hasLeft to prevent clicking it.
	const [hasLeft, setHasLeft] = useState(false);

	const onLeaveShare = useCallback(async () => {
		try {
			setLeaving(true);
			await shim.showConfirmationDialog(_('This will remove the notebook from your collection and you will no longer have access to its content. Do you wish to continue?'));
			await ShareService.instance().leaveSharedFolder(invitation.share.folder_id, sharer.id);
			setHasLeft(true);
		} finally {
			setLeaving(false);
		}
	}, [invitation, sharer]);

	const [notebookTitle, setNotebookTitle] = useState('...');
	const folderId = invitation.share.folder_id;
	useAsyncEffect(async event => {
		const folder = await Folder.load(folderId);
		if (!event.cancelled) {
			setNotebookTitle(folder?.title ?? '...');
		}
	}, [folderId]);

	return <Card>
		<Card.Title
			left={AcceptedIcon}
			title={_('Notebook: %s (%s)', notebookTitle, folderId)}
			subtitle={_('Share from %s (%s)', sharer.full_name, sharer.email)}
		/>
		<Card.Actions>
			<Button
				icon='share-off'
				onPress={onLeaveShare}
				disabled={props.processing || leaving || hasLeft}
				loading={leaving}
			>{_('Leave share')}</Button>
		</Card.Actions>
	</Card>;
};

export default AcceptedShareItem;
