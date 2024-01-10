import * as React from 'react';
import { PluginManifest } from "@joplin/lib/services/plugins/utils/types";
import { Icon, Button, Card, Chip } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { View } from 'react-native';

export enum InstallState {
	NotInstalled,
	Installing,
	Installed,
}

export enum UpdateState {
	Idle = 1,
	CanUpdate = 2,
	Updating = 3,
	HasBeenUpdated = 4,
}

export interface PluginItem {
	manifest: PluginManifest;
	enabled: boolean;
	deleted: boolean;
	installState?: InstallState;
	updateState?: UpdateState;
}

type PluginCallback = (plugin: PluginItem)=>void;

interface Props {
	item: PluginItem;
	devMode: boolean;
	builtIn: boolean;
	isCompatible: boolean;

	onInstall?: PluginCallback;
	onUpdate?: PluginCallback;
	onDelete?: PluginCallback;
	onToggle?: PluginCallback;
}

const PluginIcon = (props: any) => <Icon {...props} source='puzzle'/>;

const PluginBox: React.FC<Props> = props => {
	//const styles = useStyles(props.themeId);
	const manifest = props.item.manifest;

	const installButtonTitle = () => {
		if (props.item.installState === InstallState.Installing) return _('Installing...');
		if (props.item.installState === InstallState.NotInstalled) return _('Install');
		if (props.item.installState === InstallState.Installed) return _('Installed');
		return `Invalid install state: ${props.item.installState}`;
	};

	const installButton = (
		<Button
			onPress={() => props.onInstall?.(props.item)}
			disabled={props.item.installState !== InstallState.NotInstalled}
			loading={props.item.installState === InstallState.Installing}
		>
			{installButtonTitle()}
		</Button>
	);
	const updateButton = (
		<Button
			onPress={() => props.onUpdate?.(props.item)}
			disabled={props.item.updateState !== UpdateState.CanUpdate}
		>
			{_('Update')}
		</Button>
	);
	const deleteButton = (
		<Button
			onPress={() => props.onDelete?.(props.item)}
			disabled={props.item.deleted}
		>
			{props.item.deleted ? _('Deleted') : _('Delete')}
		</Button>
	);
	const disableButton = <Button onPress={() => props.onToggle?.(props.item)}>{_('Disable')}</Button>;
	const enableButton = <Button onPress={() => props.onToggle?.(props.item)}>{_('Enable')}</Button>;

	const renderRecommendedChip = () => {
		if (!props.item.manifest._recommended) {
			return null;
		}
		return <Chip icon='crown'>{_('Recommended')}</Chip>;
	};

	const renderBuiltInChip = () => {
		if (!props.builtIn) {
			return null;
		}
		return <Chip icon='code-tags-check'>{_('Built-in')}</Chip>;
	}

	return (
		<Card style={{margin: 8}}>
			<Card.Title
				title={manifest.name}
				subtitle={manifest.description}
				left={PluginIcon}
			/>
			<Card.Content>
				<View style={{flexDirection: 'row'}}>
					{renderRecommendedChip()}
					{renderBuiltInChip()}
				</View>
			</Card.Content>
			<Card.Actions>
				{props.onInstall ? installButton : null}
				{props.onDelete ? deleteButton : null}
				{props.onUpdate ? updateButton : null}
				{props.onToggle && props.item.enabled ? disableButton : null}
				{props.onToggle && !props.item.enabled ? enableButton : null}
			</Card.Actions>
		</Card>
	);
};

export default PluginBox;