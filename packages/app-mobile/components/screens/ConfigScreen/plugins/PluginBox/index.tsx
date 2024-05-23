import * as React from 'react';
import { Card, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import ActionButton from '../buttons/ActionButton';
import { ButtonType } from '../../../../buttons/TextButton';
import PluginChips from './PluginChips';
import { UpdateState } from '../utils/useUpdateState';
import { PluginCallback } from '../utils/usePluginCallbacks';
import { useCallback, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import InstallButton from '../buttons/InstallButton';
import PluginTitle from './PluginTitle';

export enum InstallState {
	NotInstalled,
	Installing,
	Installed,
}

interface Props {
	themeId: number;
	item: PluginItem;
	isCompatible: boolean;

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
		const baseCardStyle: ViewStyle = {
			margin: 0,
			marginTop: 8,
			padding: 0,
		};

		return StyleSheet.create({
			card: compatible ? baseCardStyle : {
				...baseCardStyle,
				opacity: 0.7,
			},
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
		<Card
			mode='outlined'
			style={styles.card}
			onPress={props.onShowPluginInfo ? onPress : null}
			testID='plugin-card'
		>
			<Card.Content style={styles.content}>
				<PluginTitle manifest={item.manifest} />
				<Text numberOfLines={2}>{manifest.description}</Text>
				<PluginChips
					themeId={props.themeId}
					item={props.item}
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
	);
};

export default PluginBox;
