import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo } from 'react';
import { Button, Card, Divider, Portal, Switch, Text } from 'react-native-paper';
import getPluginIssueReportUrl from '@joplin/lib/services/plugins/utils/getPluginIssueReportUrl';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../DismissibleDialog';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import PluginChips from './PluginBox/PluginChips';
import PluginTitle from './PluginBox/PluginTitle';
import ActionButton, { PluginCallback } from './PluginBox/ActionButton';
import TextButton, { ButtonType } from '../../../buttons/TextButton';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem|null;
	visible: boolean;
	onModalDismiss: ()=> void;

	onUpdate: PluginCallback;
	onDelete: PluginCallback;
	onToggle: PluginCallback;
}

const styles = StyleSheet.create({
	descriptionText: {
		marginTop: 5,
		marginBottom: 5,
	},
	buttonContainer: {
		display: 'flex',
		flexDirection: 'column',
		gap: 20,
		marginLeft: 10,
		marginRight: 10,
		marginTop: 30,
	},
	fraudulentPluginButton: {
		opacity: 0.6,
	},
	enabledSwitchContainer: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 10,
		marginTop: 12,
		marginBottom: 14,
	},
});

interface EnabledSwitchProps {
	item: PluginItem;
	onToggle: PluginCallback;
}

const EnabledSwitch: React.FC<EnabledSwitchProps> = props => {
	const onChange = useCallback(() => {
		props.onToggle({ item: props.item });
	}, [props.item, props.onToggle]);
	return <View style={styles.enabledSwitchContainer}>
		<Text>{_('Enabled')}</Text>
		<Switch value={props.item.enabled} onChange={onChange} />
	</View>;
};

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
		<TextButton
			type={ButtonType.Secondary}
			onPress={onReportIssuePress}
		>{_('Report an issue')}</TextButton>
	);

	const onReportFraudulentPress = useCallback(() => {
		void Linking.openURL('https://github.com/laurent22/joplin/security/advisories/new');
	}, []);

	const deleteButton = (
		<ActionButton
			item={props.item}
			inline={false}
			type={ButtonType.Delete}
			onPress={props.onDelete}
			disabled={props.item.deleted}
			title={props.item.deleted ? _('Deleted') : _('Delete')}
		/>
	);

	return <>
		<ScrollView>
			{aboutPlugin}
			<EnabledSwitch item={props.item} onToggle={props.onToggle}/>
			<Divider />
			<View style={styles.buttonContainer}>
				<TextButton
					type={ButtonType.Primary}
					onPress={onAboutPress}
				>{_('About')}</TextButton>
				{deleteButton}
			</View>
			<Divider />
			<View style={styles.buttonContainer}>
				{ reportIssueUrl ? reportIssueButton : null }
			</View>
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
