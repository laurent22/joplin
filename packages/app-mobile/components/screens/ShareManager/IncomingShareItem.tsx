import * as React from 'react';
import { ShareInvitation } from '@joplin/lib/services/share/reducer';
import invitationRespond from '@joplin/lib/services/share/invitationRespond';
import { Button, Card, Icon, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { useCallback } from 'react';
import { ViewStyle } from 'react-native';

interface Props {
	invitation: ShareInvitation;
	processing: boolean;
	containerStyle: ViewStyle;
}

const ShareIcon = (props: { size: number }) => <Icon {...props} source='account-arrow-left'/>;

const IncomingShareItem: React.FC<Props> = props => {
	const invitation = props.invitation;

	const onAcceptInvitation = useCallback(() => {
		void invitationRespond(invitation.id, invitation.share.folder_id, invitation.master_key, true);
	}, [invitation]);
	const onRejectInvitation = useCallback(() => {
		void invitationRespond(invitation.id, invitation.share.folder_id, invitation.master_key, false);
	}, [invitation]);

	const sharer = invitation.share.user;
	if (!sharer) return <Text>Error: Share missing user</Text>; // Should not happen

	return <Card style={props.containerStyle}>
		<Card.Title
			left={ShareIcon}
			title={_('Share from %s (%s)', sharer.full_name, sharer.email)}
		/>
		<Card.Actions>
			<Button
				icon='check'
				onPress={onAcceptInvitation}
				disabled={props.processing}
			>{_('Accept')}</Button>
			<Button
				icon='close'
				onPress={onRejectInvitation}
				disabled={props.processing}
			>{_('Reject')}</Button>
		</Card.Actions>
	</Card>;
};

export default IncomingShareItem;
