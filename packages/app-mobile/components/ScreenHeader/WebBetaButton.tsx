import * as React from 'react';
import { Linking, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import IconButton from '../IconButton';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import DismissibleDialog, { DialogVariant } from '../DismissibleDialog';
import { LinkButton, PrimaryButton } from '../buttons';
import makeDiscourseDebugUrl from '@joplin/lib/makeDiscourseDebugUrl';
import getPackageInfo from '../../utils/getPackageInfo';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	wrapperStyle: ViewStyle;
	iconStyle: TextStyle;
	themeId: number;
}

const onLeaveFeedback = () => {
	void Linking.openURL('https://forms.gle/B5YGDNzsUYBnoPx19');
};

const onReportBug = () => {
	void Linking.openURL(
		makeDiscourseDebugUrl('', '', [], getPackageInfo(), PluginService.instance(), Setting.value('plugins.states')),
	);
};

const styles = StyleSheet.create({
	feedbackContainer: {
		flexGrow: 1,
		flexDirection: 'row',
		gap: 16,
		justifyContent: 'flex-end',
		flexWrap: 'wrap',
	},
	paragraph: {
		paddingBottom: 7,
	},
});

const WebBetaButton: React.FC<Props> = props => {
	const [dialogVisible, setDialogVisible] = useState(false);

	const onShowDialog = useCallback(() => {
		setDialogVisible(true);
	}, []);

	const onHideDialog = useCallback(() => {
		setDialogVisible(false);
	}, []);

	const renderParagraph = (content: string) => {
		return <Text variant='bodyLarge' style={styles.paragraph}>{content}</Text>;
	};

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
				size={DialogVariant.SmallResize}
				themeId={props.themeId}
				visible={dialogVisible}
				onDismiss={onHideDialog}
			>
				{renderParagraph('Welcome to the beta version of the Joplin Web App!')}
				{renderParagraph('Thank you for participating in the beta version of the Joplin Web App.')}
				{renderParagraph('The Joplin Web App is available for a limited time in open beta and may later join the Joplin Cloud plans.')}
				{renderParagraph('Feel free to use it and let us know if have any questions or notice any issues!')}
				<View style={styles.feedbackContainer}>
					<LinkButton onPress={onReportBug}>{'Report bug'}</LinkButton>
					<PrimaryButton onPress={onLeaveFeedback}>{'Give feedback'}</PrimaryButton>
				</View>
			</DismissibleDialog>
		</>
	);
};

export default WebBetaButton;
