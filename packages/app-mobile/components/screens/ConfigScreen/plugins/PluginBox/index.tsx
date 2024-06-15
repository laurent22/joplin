import * as React from 'react';
import { Card, Text, TouchableRipple } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import ActionButton from '../buttons/ActionButton';
import { ButtonType } from '../../../../buttons/TextButton';
import PluginChips from './PluginChips';
import { UpdateState } from '../utils/useUpdateState';
import { PluginCallback } from '../utils/usePluginCallbacks';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import InstallButton from '../buttons/InstallButton';
import PluginTitle from './PluginTitle';
import RecommendedBadge from './RecommendedBadge';

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

const useStyles = (compatible: boolean) => {
	return useMemo(() => {
		// For the TouchableRipple to work on Android, the card needs a transparent background.
		const baseCard = { backgroundColor: 'transparent' };
		return StyleSheet.create({
			cardContainer: {
				margin: 0,
				marginTop: 8,
				padding: 0,
				borderRadius: 14,
			},
			card: !compatible ? {
				...baseCard,
				opacity: 0.7,
			} : baseCard,
			content: {
				gap: 5,
			},
		});
	}, [compatible]);
};


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

	const styles = useStyles(props.isCompatible);

	return (
		<TouchableRipple
			accessibilityRole='button'
			accessible={true}
			onPress={props.onShowPluginInfo ? onPress : null}
			style={styles.cardContainer}
		>
			<Card
				mode='outlined'
				style={styles.card}
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
			</Card>
		</TouchableRipple>
	);
};

export default PluginBox;
