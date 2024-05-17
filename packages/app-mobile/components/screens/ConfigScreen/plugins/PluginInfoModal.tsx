import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo } from 'react';
import { Button, Card, List, Portal, Text } from 'react-native-paper';
import getPluginIssueReportUrl from '@joplin/lib/services/plugins/utils/getPluginIssueReportUrl';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../DismissibleDialog';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import PluginChips from './PluginBox/PluginChips';
import PluginTitle from './PluginBox/PluginTitle';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem|null;
	visible: boolean;
	onModalDismiss: ()=> void;
}

const styles = StyleSheet.create({
	aboutPluginContainer: {
		paddingLeft: 10,
		paddingRight: 10,
		paddingBottom: 10,
	},
	descriptionText: {
		marginTop: 5,
		marginBottom: 5,
	},
	fraudulentPluginButton: {
		opacity: 0.6,
	},
});

const PluginInfoModalContent: React.FC<Props> = props => {
	const manifest = props.item.manifest;
	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(manifest);
	}, [manifest]);

	const plugin = useMemo(() => {
		return PluginService.instance().pluginById(manifest.id);
	}, [manifest]);

	const aboutPlugin = (
		<Card mode='outlined' style={{ margin: 8 }} testID='plugin-card'>
			<Card.Content>
				<PluginTitle manifest={manifest}/>
				<Text variant='bodyMedium'>{_('by %s', manifest.author)}</Text>
				<View style={{ marginTop: 8 }}>
					<PluginChips
						themeId={props.themeId}
						item={props.item}
						hasErrors={plugin?.hasErrors}
						isCompatible={isCompatible}
					/>
					<Text>{manifest.description}</Text>
				</View>
			</Card.Content>
		</Card>
	);

	const onAboutPress = useCallback(() => {
		void openWebsiteForPlugin({ item: props.item });
	}, [props.item]);

	const reportIssueUrl = useMemo(() => {
		return getPluginIssueReportUrl(props.item.manifest);
	}, [props.item]);

	const onReportIssuePress = useCallback(() => {
		void Linking.openURL(reportIssueUrl);
	}, [reportIssueUrl]);

	const reportIssueButton = (
		<List.Item
			left={props => <List.Icon {...props} icon='bug'/>}
			title={_('Report an issue')}
			onPress={onReportIssuePress}
		/>
	);

	const onReportFraudulentPress = useCallback(() => {
		void Linking.openURL('https://github.com/laurent22/joplin/security/advisories/new');
	}, []);

	return <>
		<ScrollView>
			{aboutPlugin}
			<List.Item
				left={props => <List.Icon {...props} icon='web'/>}
				title={_('About')}
				onPress={onAboutPress}
			/>
			{ reportIssueUrl ? reportIssueButton : null }
		</ScrollView>
		<Button
			icon='shield-bug'
			style={styles.fraudulentPluginButton}
			onPress={onReportFraudulentPress}
		>{_('Report fraudulent plugin')}</Button>
	</>;
};

const PluginInfoModal: React.FC<Props> = props => {
	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={props.visible}
				onDismiss={props.onModalDismiss}
			>
				{ props.item ? <PluginInfoModalContent {...props}/> : null }
			</DismissibleDialog>
		</Portal>
	);
};

export default PluginInfoModal;
