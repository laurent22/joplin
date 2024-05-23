import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo } from 'react';
import { Button, Card, Divider, Portal, Switch, Text } from 'react-native-paper';
import getPluginIssueReportUrl from '@joplin/lib/services/plugins/utils/getPluginIssueReportUrl';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../DismissibleDialog';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginChips from './PluginBox/PluginChips';
import PluginTitle from './PluginBox/PluginTitle';
import ActionButton from './buttons/ActionButton';
import TextButton, { ButtonType } from '../../../buttons/TextButton';
import useUpdateState, { UpdateState } from './utils/useUpdateState';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';
import usePluginItem from './utils/usePluginItem';
import InstallButton from './buttons/InstallButton';
import { InstallState } from './PluginBox';

interface Props {
	themeId: number;
	initialItem: PluginItem|null;
	updatablePluginIds: Record<string, boolean>;
	updatingPluginIds: Record<string, boolean>;
	installingPluginIds: Record<string, boolean>;
	visible: boolean;
	pluginSettings: PluginSettings;
	onModalDismiss: ()=> void;

	pluginCallbacks: PluginCallbacks;
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
		marginBottom: 30,
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

	if (!props.item?.installed || props.item.deleted) {
		return null;
	}

	return <View style={styles.enabledSwitchContainer}>
		<Text>{_('Enabled')}</Text>
		<Switch value={props.item.enabled} onChange={onChange} />
	</View>;
};

const PluginInfoModalContent: React.FC<Props> = props => {
	const pluginId = props.initialItem.manifest.id;
	const item = usePluginItem(pluginId, props.pluginSettings);

	const manifest = item.manifest;
	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(manifest);
	}, [manifest]);

	const plugin = useMemo(() => {
		const service = PluginService.instance();
		if (!service.pluginIds.includes(pluginId)) {
			return null;
		}
		return service.pluginById(pluginId);
	}, [pluginId]);

	const aboutPlugin = (
		<Card mode='outlined' style={{ margin: 8 }} testID='plugin-card'>
			<Card.Content>
				<PluginTitle manifest={manifest}/>
				<Text variant='bodyMedium'>{_('by %s', manifest.author)}</Text>
				<View style={{ marginTop: 8 }}>
					<PluginChips
						themeId={props.themeId}
						item={item}
						hasErrors={plugin?.hasErrors}
						isCompatible={isCompatible}
					/>
					<Text>{manifest.description}</Text>
				</View>
			</Card.Content>
		</Card>
	);

	const onAboutPress = useCallback(() => {
		void openWebsiteForPlugin({ item });
	}, [item]);

	const reportIssueUrl = useMemo(() => {
		return getPluginIssueReportUrl(manifest);
	}, [manifest]);

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

	const updateState = useUpdateState({
		pluginId: plugin?.id,
		pluginSettings: props.pluginSettings,
		updatablePluginIds: props.updatablePluginIds,
		updatingPluginIds: props.updatingPluginIds,
	});

	const getUpdateButtonTitle = () => {
		if (updateState === UpdateState.Updating) return _('Updating...');
		if (updateState === UpdateState.HasBeenUpdated) return _('Updated');
		return _('Update');
	};

	const updateButton = (
		<ActionButton
			item={item}
			type={ButtonType.Secondary}
			onPress={props.pluginCallbacks.onUpdate}
			disabled={updateState !== UpdateState.CanUpdate || !isCompatible}
			loading={updateState === UpdateState.Updating}
			title={getUpdateButtonTitle()}
		/>
	);

	const installState = (() => {
		if (item.installed) return InstallState.Installed;
		if (props.installingPluginIds[pluginId]) return InstallState.Installing;
		return InstallState.NotInstalled;
	})();

	const installButton = (
		<InstallButton
			item={item}
			onInstall={props.pluginCallbacks.onInstall}
			installState={installState}
			isCompatible={isCompatible}
		/>
	);

	const deleteButton = (
		<ActionButton
			item={item}
			type={ButtonType.Delete}
			onPress={props.pluginCallbacks.onDelete}
			disabled={item.builtIn || (item?.deleted ?? true)}
			title={item?.deleted ? _('Deleted') : _('Delete')}
		/>
	);

	const deleteButtonContainer = <>
		<View style={styles.buttonContainer}>
			{deleteButton}
		</View>
		<Divider />
	</>;

	return <>
		<ScrollView>
			{aboutPlugin}
			<EnabledSwitch item={item} onToggle={props.pluginCallbacks.onToggle}/>
			<Divider />
			<View style={styles.buttonContainer}>
				{!item.installed ? installButton : null}
				<TextButton
					type={item.installed ? ButtonType.Primary : ButtonType.Secondary}
					onPress={onAboutPress}
				>{_('About')}</TextButton>
				{updateState !== UpdateState.Idle ? updateButton : null}
			</View>
			<Divider />
			{ item.installed ? deleteButtonContainer : null }
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
				{ props.initialItem ? <PluginInfoModalContent {...props}/> : null }
			</DismissibleDialog>
		</Portal>
	);
};

export default PluginInfoModal;
