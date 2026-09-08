import * as React from 'react';
import DismissibleDialog, { DialogVariant } from '../DismissibleDialog';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { useCallback, useMemo, useState } from 'react';
import { Icon, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import JoplinCloudIcon from './JoplinCloudIcon';
import NavService from '@joplin/lib/services/NavService';
import { Platform, StyleSheet, View } from 'react-native';
import CardButton from '../buttons/CardButton';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import Logger from '@joplin/utils/Logger';

interface Props {
	dispatch: Dispatch;
	visible: boolean;
	themeId: number;
}

const iconSize = 24;
const logger = Logger.create('SyncWizard');
const styles = StyleSheet.create({
	titleContainer: {
		flexDirection: 'row',
		gap: 8,
		paddingBottom: 6,
		alignItems: 'center',
	},
	subheading: {
		marginBottom: 24,
	},
	cardContent: {
		padding: 12,
		borderRadius: 14,
	},
	syncProviderList: {
		gap: 8,
	},
	featuresList: {
		marginTop: 4,
	},
	listItem: {
		flexDirection: 'row',
		gap: 8,
		marginVertical: 6,
		verticalAlign: 'middle',
	},
});

const isAppJoplinCloud = () => {
	return Setting.value('isJoplinCloudWebApp');
};

// Sync targets that have a dedicated login screen are shown as cards and, once
// selected, redirect to that screen. The others (self-hosted, WebDAV, file
// system, etc.) redirect to the sync settings so the user can enter the
// connection details.
const syncTargetRoutes: Record<string, string> = {
	'dropbox': 'DropboxLogin',
	'onedrive': 'OneDriveLogin',
	'joplinCloud': 'JoplinCloudLogin',
};

const syncTargetIcon = (name: string) => {
	switch (name) {
		case 'joplinServer':
		case 'joplinServerSaml':
			return <JoplinCloudIcon width={iconSize} height={iconSize}/>;
		case 'dropbox':
			return <Icon size={iconSize} source='dropbox'/>;
		case 'onedrive':
			return <Icon size={iconSize} source='microsoft-onedrive'/>;
		case 'nextcloud':
			return <Icon size={iconSize} source='cloud'/>;
		case 'webdav':
			return <Icon size={iconSize} source='folder-network'/>;
		case 'amazon_s3':
			return <Icon size={iconSize} source='cloud-upload-outline'/>;
		case 'filesystem':
			return <Icon size={iconSize} source='folder'/>;
		default:
			return <Icon size={iconSize} source='dots-horizontal-circle'/>;
	}
};

const useShouldShowOtherButton = () => {
	// Don't show "other" when hosted on Joplin Cloud (other sync
	// targets can still be selected from settings).
	return !isAppJoplinCloud();
};

interface SyncProviderProps {
	title: string;
	icon: ()=> React.ReactNode;
	description: string|null;
	onPress: ()=> void;
	featuresList: string[];
	disabled: boolean;
}

const SyncProvider: React.FC<SyncProviderProps> = props => {
	return <CardButton
		disabled={props.disabled}
		onPress={props.onPress}
		testID='sync-provider-card'
	>
		<View style={styles.cardContent}>
			<View style={styles.titleContainer}>
				{props.icon()}
				<Text variant='titleMedium'>{props.title}{props.disabled ? ' (Not supported)' : ''}</Text>
			</View>
			{props.description && <Text variant='bodyMedium'>{props.description}</Text>}
			<View style={styles.featuresList}>
				{props.featuresList.map((feature, index) => (
					<View key={`feature-${index}`} style={styles.listItem}>
						<Icon size={14} source='check'/><Text>{feature}</Text>
					</View>
				))}
			</View>
		</View>
	</CardButton>;
};

const SyncWizard: React.FC<Props> = ({ themeId, visible, dispatch }) => {
	const [showAllSyncTargets, setShowAllSyncTargets] = useState(false);

	const onDismiss = useCallback(() => {
		dispatch({
			type: 'SYNC_WIZARD_VISIBLE_CHANGE',
			visible: false,
		});
	}, [dispatch]);

	const onManualDismiss = useCallback(() => {
		Setting.setValue('sync.wizard.autoShowOnStartup', false);
		onDismiss();
	}, [onDismiss]);

	const onSelectJoplinCloud = useCallback(async () => {
		onDismiss();
		if (Platform.OS === 'web' && !isAppJoplinCloud()) {
			if (await shim.showConfirmationDialog(
				_('Self-hosted instances of the Joplin web app cannot sync with Joplin Cloud. Open the official web app?'),
			)) {
				await shim.openUrl('https://app.joplincloud.com/');
			}
		} else {
			await NavService.go('JoplinCloudLogin');
		}
	}, [onDismiss]);

	const onSelectOtherTarget = useCallback(() => {
		// Keep the dialog open and expand it to show the full list of sync targets.
		setShowAllSyncTargets(true);
	}, []);

	const onSelectSyncTarget = useCallback(async (name: string) => {
		const info = SyncTargetRegistry.infoByName(name);

		// Persist the selection so that it is kept even if the user cancels the
		// login or configuration step that follows.
		Setting.setValue('sync.target', info.id);

		try {
			await Setting.saveAll();

			onDismiss();

			const routeName = syncTargetRoutes[name];
			if (routeName) {
				await NavService.go(routeName);
			} else {
				await NavService.go('Config', { sectionName: 'sync' });
			}
		} catch (error) {
			logger.error('Failed to save sync target setting:', error);
		}
	}, [onDismiss]);

	const otherSyncTargets = useMemo(() => {
		const excludedTargetNames = ['none', 'joplinCloud'];
		return SyncTargetRegistry.allIds()
			.map(id => SyncTargetRegistry.idToName(id))
			.filter(name => !excludedTargetNames.includes(name))
			.map(name => SyncTargetRegistry.infoByName(name))
			.filter(info => info.classRef.unsupportedPlatforms().indexOf(Platform.OS) < 0);
	}, []);

	const showOther = useShouldShowOtherButton();

	const isJoplinCloud = isAppJoplinCloud();
	return <DismissibleDialog
		themeId={themeId}
		visible={visible}
		onDismiss={onManualDismiss}
		size={DialogVariant.SmallResize}
		scrollOverflow={true}
		heading={_('Synchronisation')}
	>
		<Text variant='bodyLarge' role='heading' style={styles.subheading}>{
			showAllSyncTargets
				? _('Select one of the other supported sync targets.')
				: isJoplinCloud
					? _('You can synchronise your notes using Joplin Cloud, which also gives access to Joplin-specific features such as publishing notes or collaborating on notebooks with others.')
					: _('Joplin can synchronise your notes using various providers. Select one from the list below.')
		}</Text>
		{showAllSyncTargets ? (
			<View style={styles.syncProviderList}>
				{otherSyncTargets.map(info => (
					<SyncProvider
						key={info.name}
						title={info.label}
						description={info.description}
						icon={() => syncTargetIcon(info.name)}
						featuresList={[]}
						onPress={() => void onSelectSyncTarget(info.name)}
						disabled={false}
					/>
				))}
			</View>
		) : (
			<View style={styles.syncProviderList}>
				<SyncProvider
					title={isJoplinCloud ? _('Synchronise with Joplin Cloud') : _('Joplin Cloud')}
					description={
						isJoplinCloud ? null : _('Joplin\'s own sync service. Also gives access to Joplin-specific features such as publishing notes or collaborating on notebooks with others.')
					}
					featuresList={[
						_('Sync your notes'),
						_('Publish notes to the internet'),
						_('Collaborate on notebooks with others'),
					]}
					icon={() => <JoplinCloudIcon width={iconSize} height={iconSize}/>}
					onPress={onSelectJoplinCloud}
					disabled={false}
				/>
				{showOther && <SyncProvider
					title={_('Other')}
					description={_('Select one of the other supported sync targets.')}
					icon={() => <Icon size={iconSize} source='dots-horizontal-circle'/>}
					featuresList={[]}
					onPress={onSelectOtherTarget}
					disabled={false}
				/>}
			</View>
		)}
	</DismissibleDialog>;
};

export default connect((state: AppState) => ({
	visible: state.syncWizardVisible,
	themeId: state.settings.theme,
}))(SyncWizard);
