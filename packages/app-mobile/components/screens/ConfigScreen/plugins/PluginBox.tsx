import * as React from 'react';
import { Icon, Button, Card, Chip } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Alert, View } from 'react-native';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';

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

type PluginCallback = (event: ItemEvent)=> void;

interface Props {
	item: PluginItem;
	isCompatible: boolean;

	hasErrors?: boolean;
	installState?: InstallState;
	updateState?: UpdateState;

	onInstall?: PluginCallback;
	onUpdate?: PluginCallback;
	onDelete?: PluginCallback;
	onToggle?: PluginCallback;
	onAboutPress?: PluginCallback;
	onShowPluginLog?: PluginCallback;
}

const PluginIcon = (props: any) => <Icon {...props} source='puzzle'/>;

const PluginBox: React.FC<Props> = props => {
	const manifest = props.item.manifest;
	const item = props.item;

	const installButtonTitle = () => {
		if (props.installState === InstallState.Installing) return _('Installing...');
		if (props.installState === InstallState.NotInstalled) return _('Install');
		if (props.installState === InstallState.Installed) return _('Installed');
		return `Invalid install state: ${props.installState}`;
	};

	const installButton = (
		<Button
			onPress={() => props.onInstall?.({ item })}
			disabled={props.installState !== InstallState.NotInstalled || !props.isCompatible}
			loading={props.installState === InstallState.Installing}
		>
			{installButtonTitle()}
		</Button>
	);

	const updateButtonTitle = () => {
		if (props.updateState === UpdateState.Updating) return _('Updating...');
		if (props.updateState === UpdateState.HasBeenUpdated) return _('Updated');
		return _('Update');
	};

	const updateButton = (
		<Button
			onPress={() => props.onUpdate?.({ item })}
			disabled={props.updateState !== UpdateState.CanUpdate || !props.isCompatible}
			loading={props.updateState === UpdateState.Updating}
		>
			{updateButtonTitle()}
		</Button>
	);
	const deleteButton = (
		<Button
			onPress={() => props.onDelete?.({ item })}
			disabled={props.item.deleted}
		>
			{props.item.deleted ? _('Deleted') : _('Delete')}
		</Button>
	);
	const disableButton = <Button onPress={() => props.onToggle?.({ item })}>{_('Disable')}</Button>;
	const enableButton = <Button onPress={() => props.onToggle?.({ item })}>{_('Enable')}</Button>;
	const aboutButton = <Button icon='web' onPress={() => props.onAboutPress?.({ item })}>{_('About')}</Button>;

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<Chip
				icon='alert'
				mode='outlined'
				onPress={() => props.onShowPluginLog({ item })}
			>
				Error
			</Chip>
		);
	};

	const renderRecommendedChip = () => {
		const onRecommendedPress = () => {
			Alert.alert('Recommended Plugin', 'The Joplin team has vetted this plugin and it meets our standards for security and performance.');
		};

		if (!props.item.manifest._recommended) {
			return null;
		}
		return <Chip
			icon='crown'
			mode='outlined'
			onPress={() => onRecommendedPress()}
		>
			{_('Recommended')}
		</Chip>;
	};

	const renderBuiltInChip = () => {
		if (!props.item.builtIn) {
			return null;
		}
		return <Chip icon='code-tags-check' mode='outlined'>{_('Built-in')}</Chip>;
	};

	const updateStateIsIdle = props.updateState !== UpdateState.Idle;

	return (
		<Card style={{ margin: 8 }} testID='plugin-card'>
			<Card.Title
				title={manifest.name}
				subtitle={manifest.description}
				left={PluginIcon}
			/>
			<Card.Content>
				<View style={{ flexDirection: 'row' }}>
					{renderErrorsChip()}
					{renderRecommendedChip()}
					{renderBuiltInChip()}
				</View>
			</Card.Content>
			<Card.Actions>
				{props.onAboutPress ? aboutButton : null}
				{props.onInstall ? installButton : null}
				{props.onDelete && !props.item.builtIn ? deleteButton : null}
				{props.onUpdate && updateStateIsIdle ? updateButton : null}
				{props.onToggle && props.item.enabled ? disableButton : null}
				{props.onToggle && !props.item.enabled ? enableButton : null}
			</Card.Actions>
		</Card>
	);
};

export default PluginBox;
