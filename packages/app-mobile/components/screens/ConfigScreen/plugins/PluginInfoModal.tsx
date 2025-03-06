import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo } from 'react';
import { Card, Divider, List, Portal, Switch, Text } from 'react-native-paper';
import getPluginIssueReportUrl from '@joplin/lib/services/plugins/utils/getPluginIssueReportUrl';
import { Linking, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import DismissibleDialog, { DialogSize } from '../../../DismissibleDialog';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginTitle from './PluginBox/PluginTitle';
import ActionButton from './buttons/ActionButton';
import TextButton, { ButtonType } from '../../../buttons/TextButton';
import useUpdateState, { UpdateState } from './utils/useUpdateState';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';
import usePluginItem from './utils/usePluginItem';
import InstallButton from './buttons/InstallButton';
import { InstallState } from './PluginBox';
import PluginChips from './PluginBox/PluginChips';
import { PluginStatusRecord } from '../types';

interface Props {
	themeId: number;

	visible: boolean;
	item: PluginItem|null;

	updatablePluginIds: PluginStatusRecord;
	updatingPluginIds: PluginStatusRecord;
	installingPluginIds: PluginStatusRecord;

	pluginCallbacks: PluginCallbacks;
	pluginSettings: PluginSettings;
	onModalDismiss: ()=> void;
}

const styles = (() => {
	const baseButtonContainer: ViewStyle = {
		display: 'flex',
		flexDirection: 'column',
		gap: 20,
		marginLeft: 10,
		marginRight: 10,
	};
	return StyleSheet.create({
		descriptionText: {
			marginTop: 5,
			marginBottom: 5,
		},
		buttonContainer: {
			...baseButtonContainer,
			marginTop: 26,
			marginBottom: 26,
		},
		accordionContent: {
			...baseButtonContainer,
			marginTop: 12,
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
		pluginDescriptionContainer: {
			marginTop: 8,
			gap: 8,
		},
	});
})();

interface EnabledSwitchProps {
	item: PluginItem;
	onToggle: PluginCallback;
}

const EnabledSwitch: React.FC<EnabledSwitchProps> = props => {
	const onChange = useCallback((value: boolean) => {
		if (value !== props.item.enabled) {
			props.onToggle({ item: props.item });
		}
	}, [props.item, props.onToggle]);

	if (!props.item?.installed || props.item.deleted) {
		return null;
	}

	return <View style={styles.enabledSwitchContainer}>
		<Text nativeID='enabledLabel'>{_('Enabled')}</Text>
		<Switch accessibilityLabelledBy='enabledLabel' value={props.item.enabled} onValueChange={onChange} />
	</View>;
};

const PluginInfoModalContent: React.FC<Props> = props => {
	const initialItem = props.item;
	const pluginId = initialItem.manifest.id;
	const item = usePluginItem(pluginId, props.pluginSettings, initialItem);

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

	const updateState = useUpdateState({
		pluginId: plugin?.id,
		pluginSettings: props.pluginSettings,
		updatablePluginIds: props.updatablePluginIds,
		updatingPluginIds: props.updatingPluginIds,
	});

	const aboutPlugin = (
		<Card mode='outlined' style={{ margin: 8 }} testID='plugin-card'>
			<Card.Content>
				<PluginTitle manifest={manifest}/>
				<Text variant='bodyMedium'>{_('by %s', manifest.author)}</Text>
				<View style={styles.pluginDescriptionContainer}>
					<PluginChips
						themeId={props.themeId}
						item={item}
						showInstalledChip={false}
						hasErrors={plugin.hasErrors}
						canUpdate={false}
						onShowPluginLog={props.pluginCallbacks.onShowPluginLog}
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
			disabled={item.builtIn || item.devMode || (item?.deleted ?? true)}
			title={item?.deleted ? _('Deleted') : _('Delete')}
		/>
	);

	const deleteButtonContainer = <>
		<View style={styles.buttonContainer}>
			{deleteButton}
		</View>
		<Divider />
	</>;

	const reportIssuesContainer = (
		<List.Accordion title={_('Report any issues concerning the plugin.')} titleNumberOfLines={2}>
			<View style={styles.accordionContent}>
				<TextButton
					type={ButtonType.Secondary}
					onPress={onReportFraudulentPress}
				>{_('Report fraudulent plugin')}</TextButton>
				{reportIssueButton}
			</View>
		</List.Accordion>
	);

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
			{reportIssuesContainer}
		</ScrollView>
	</>;
};

const PluginInfoModal: React.FC<Props> = props => {
	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={props.visible}
				size={DialogSize.Small}
				onDismiss={props.onModalDismiss}
			>
				{ props.item ? <PluginInfoModalContent {...props}/> : null }
			</DismissibleDialog>
		</Portal>
	);
};

export default PluginInfoModal;
