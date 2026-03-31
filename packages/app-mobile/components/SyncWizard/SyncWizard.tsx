import * as React from 'react';
import DismissibleDialog, { DialogVariant } from '../DismissibleDialog';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { useCallback } from 'react';
import { Icon, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import JoplinCloudIcon from './JoplinCloudIcon';
import NavService from '@joplin/lib/services/NavService';
import { Platform, StyleSheet, View } from 'react-native';
import CardButton from '../buttons/CardButton';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';

interface Props {
	dispatch: Dispatch;
	visible: boolean;
	themeId: number;
}

const iconSize = 24;
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
	return Platform.OS === 'web' && location.origin === 'https://app.joplincloud.com';
};

const useShouldShowOtherButton = () => {
	// Don't show "other" when hosted on Joplin Cloud (other sync
	// targets can still be selected from settings).
	return !isAppJoplinCloud();
};

interface SyncProviderProps {
	title: string;
	icon: ()=> React.ReactNode;
	description: string;
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

	const onSelectOtherTarget = useCallback(async () => {
		onDismiss();
		await NavService.go('Config', { sectionName: 'sync' });
	}, [onDismiss]);

	const showOther = useShouldShowOtherButton();

	return <DismissibleDialog
		themeId={themeId}
		visible={visible}
		onDismiss={onManualDismiss}
		size={DialogVariant.SmallResize}
		scrollOverflow={true}
		heading={_('Synchronisation')}
	>
		<Text variant='bodyLarge' role='heading' style={styles.subheading}>{
			_('Joplin can synchronise your notes using various providers. Select one from the list below.')
		}</Text>
		<View style={styles.syncProviderList}>
			<SyncProvider
				title={_('Joplin Cloud')}
				description={_('Joplin\'s own sync service. Also gives access to Joplin-specific features such as publishing notes or collaborating on notebooks with others.')}
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
	</DismissibleDialog>;
};

export default connect((state: AppState) => ({
	visible: state.syncWizardVisible,
	themeId: state.settings.theme,
}))(SyncWizard);
