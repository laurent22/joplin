import * as React from 'react';
import { Linking, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import IconButton from '../IconButton';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import DismissibleDialog, { DialogSize } from '../DismissibleDialog';
import { LinkButton } from '../buttons';

interface Props {
	wrapperStyle: ViewStyle;
	iconStyle: TextStyle;
	themeId: number;
}

const onLeaveFeedback = () => {
	void Linking.openURL('https://discourse.joplinapp.org/t/web-client-running-joplin-mobile-in-a-web-browser-with-react-native-web/38749');
};

const feedbackContainerStyles: ViewStyle = { flexGrow: 1, justifyContent: 'flex-end' };

const WebBetaButton: React.FC<Props> = props => {
	const [dialogVisible, setDialogVisible] = useState(false);

	const onShowDialog = useCallback(() => {
		setDialogVisible(true);
	}, []);

	const onHideDialog = useCallback(() => {
		setDialogVisible(false);
	}, []);

	return (
		<>
			<IconButton
				onPress={onShowDialog}
				description={_('Beta')}
				themeId={props.themeId}
				contentWrapperStyle={props.wrapperStyle}

				iconName="material beta"
				iconStyle={props.iconStyle}
			/>
			<DismissibleDialog
				heading={_('Beta')}
				size={DialogSize.Small}
				themeId={props.themeId}
				visible={dialogVisible}
				onDismiss={onHideDialog}
			>
				<Text>{'At present, the web client is in beta. In the future, it may change significantly, or be removed.'}</Text>
				<View style={feedbackContainerStyles}>
					<LinkButton onPress={onLeaveFeedback}>{'Give feedback'}</LinkButton>
				</View>
			</DismissibleDialog>
		</>
	);
};

export default WebBetaButton;
