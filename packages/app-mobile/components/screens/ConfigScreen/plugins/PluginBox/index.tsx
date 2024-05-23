import * as React from 'react';
import { Card } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import ActionButton from '../buttons/ActionButton';
import { ButtonType } from '../../../../buttons/TextButton';
import PluginChips from './PluginChips';
import PluginTitle from './PluginTitle';
import { UpdateState } from '../utils/useUpdateState';
import { PluginCallback } from '../utils/usePluginCallbacks';
import { useCallback, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import InstallButton from '../buttons/InstallButton';

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
			title: {
				paddingTop: 10,
				paddingBottom: 0,
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
			<Card.Title
				style={styles.title}
				title={<PluginTitle manifest={item.manifest} />}
				subtitle={manifest.description}
				subtitleNumberOfLines={2}
			/>
			<Card.Content>
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
