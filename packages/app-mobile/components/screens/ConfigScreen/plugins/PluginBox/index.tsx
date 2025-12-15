import * as React from 'react';
import { Card, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import ActionButton from '../buttons/ActionButton';
import { ButtonType } from '../../../../buttons/TextButton';
import PluginChips from './PluginChips';
import { UpdateState } from '../utils/useUpdateState';
import { PluginCallback } from '../utils/usePluginCallbacks';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import InstallButton from '../buttons/InstallButton';
import PluginTitle from './PluginTitle';
import RecommendedBadge from './RecommendedBadge';
import CardButton from '../../../../buttons/CardButton';

export enum InstallState {
	NotInstalled,
	Installing,
	Installed,
}

interface Props {
	themeId: number;
	item: PluginItem;
	isCompatible: boolean;

	// In some cases, showing an "installed" chip is redundant (e.g. in the "installed plugins"
	// tab). In other places (e.g. search), an "installed" chip is important.
	showInstalledChip: boolean;

	hasErrors?: boolean;
	installState?: InstallState;
	updateState?: UpdateState;

	onAboutPress?: PluginCallback;
	onInstall?: PluginCallback;
	onShowPluginLog?: PluginCallback;
	onShowPluginInfo?: PluginCallback;
}

const styles = StyleSheet.create({
	content: {
		gap: 5,
	},
	cardContainer: {
		marginTop: 8,
	},
});

const PluginBox: React.FC<Props> = props => {
	const manifest = props.item.manifest;
	const item = props.item;

	const installButton = <InstallButton
		item={item}
		onInstall={props.onInstall}
		installState={props.installState}
		isCompatible={props.isCompatible}
	/>;

	const aboutButton = <ActionButton type={ButtonType.Link} item={item} onPress={props.onAboutPress} title={_('About')}/>;

	const onPress = useCallback(() => {
		props.onShowPluginInfo?.({ item: props.item });
	}, [props.onShowPluginInfo, props.item]);

	return (
		<CardButton
			style={styles.cardContainer}
			onPress={props.onShowPluginInfo ? onPress : null}
			testID='plugin-card'
		>
			<Card.Content style={styles.content}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
					<View style={{ flexShrink: 1 }}>
						<PluginTitle manifest={item.manifest} />
						<Text numberOfLines={2}>{manifest.description}</Text>
					</View>
					<RecommendedBadge manifest={item.manifest} isCompatible={props.isCompatible} themeId={props.themeId} />
				</View>
				<PluginChips
					themeId={props.themeId}
					item={props.item}
					showInstalledChip={props.showInstalledChip}
					hasErrors={props.hasErrors}
					canUpdate={props.updateState === UpdateState.CanUpdate}
					onShowPluginLog={props.onShowPluginLog}
					isCompatible={props.isCompatible}
				/>
			</Card.Content>
			<Card.Actions>
				{props.onAboutPress ? aboutButton : null}
				{props.onInstall ? installButton : null}
			</Card.Actions>
		</CardButton>
	);
};

export default PluginBox;
