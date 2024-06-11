import * as React from 'react';
import { ShareInvitation } from '@joplin/lib/services/share/reducer';
import { Button, Card, Icon } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import ShareService from '@joplin/lib/services/share/ShareService';
import shim from '@joplin/lib/shim';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Folder from '@joplin/lib/models/Folder';
import { FolderEntity } from '@joplin/lib/services/database/types';
import Logger from '@joplin/utils/Logger';
import { ViewStyle } from 'react-native';

interface Props {
	invitation: ShareInvitation;
	processing: boolean;
	containerStyle: ViewStyle;
}

const AcceptedIcon = (props: { size: number }) => <Icon {...props} source='account-multiple-check'/>;

const useFolderTitle = (folderId: string) => {
	const [folderTitle, setFolderTitle] = useState(undefined);

	useAsyncEffect(async event => {
		let folder: FolderEntity|null = null;

		// If the share was just accepted, the folder might not exist yet.
		// In this case, check for the shared item multiple times.
		while (!folder && !event.cancelled) {
			folder = await Folder.load(folderId);
			if (folder) {
				setFolderTitle(folder.title);
				break;
			}

			await new Promise<void>(resolve => {
				shim.setTimeout(() => resolve(), 1000);
			});
		}
	}, [folderId]);

	return folderTitle ?? '...';
};

const logger = Logger.create('AcceptedShareItem');

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
			if (await shim.showConfirmationDialog(_('This will remove the notebook from your collection and you will no longer have access to its content. Do you wish to continue?'))) {
				await ShareService.instance().leaveSharedFolder(invitation.share.folder_id, sharer.id);
				setHasLeft(true);
			}
		} catch (error) {
			logger.error('Failed to leave share', error);
			await shim.showMessageBox(
				_('Error: %s', error),
				{ buttons: [_('OK')] },
			);
		} finally {
			setLeaving(false);
		}
	}, [invitation, sharer]);

	const folderId = invitation.share.folder_id;
	const folderTitle = useFolderTitle(folderId);

	return <Card style={props.containerStyle}>
		<Card.Title
			left={AcceptedIcon}
			title={_('Notebook: %s (%s)', folderTitle, folderId)}
			subtitle={_('Share from %s (%s)', sharer.full_name, sharer.email)}
		/>
		<Card.Actions>
			<Button
				icon='share-off'
				onPress={onLeaveShare}
				disabled={props.processing || leaving || hasLeft}
				loading={leaving || !folderTitle}
			>{_('Leave notebook')}</Button>
		</Card.Actions>
	</Card>;
};

export default AcceptedShareItem;
