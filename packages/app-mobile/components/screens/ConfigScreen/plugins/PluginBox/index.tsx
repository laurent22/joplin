import * as React from 'react';
import { Card } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import ActionButton, { PluginCallback } from './ActionButton';
import PluginInfoButton from './PluginInfoButton';
import { ButtonType } from '../../../../buttons/TextButton';
import PluginChips from './PluginChips';
import PluginTitle from './PluginTitle';

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

interface Props {
	themeId: number;
	item: PluginItem;
	isCompatible: boolean;
	showInfoButton: boolean;

	hasErrors?: boolean;
	installState?: InstallState;
	updateState?: UpdateState;

	onAboutPress?: PluginCallback;
	onInstall?: PluginCallback;
	onUpdate?: PluginCallback;
	onDelete?: PluginCallback;
	onToggle?: PluginCallback;
	onShowPluginLog?: PluginCallback;
}

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
		<ActionButton
			item={item}
			onPress={props.onInstall}
			disabled={props.installState !== InstallState.NotInstalled || !props.isCompatible}
			loading={props.installState === InstallState.Installing}
			title={installButtonTitle()}
		/>
	);

	const getUpdateButtonTitle = () => {
		if (props.updateState === UpdateState.Updating) return _('Updating...');
		if (props.updateState === UpdateState.HasBeenUpdated) return _('Updated');
		return _('Update');
	};

	const updateButton = (
		<ActionButton
			item={item}
			onPress={props.onUpdate}
			disabled={props.updateState !== UpdateState.CanUpdate || !props.isCompatible}
			loading={props.updateState === UpdateState.Updating}
			title={getUpdateButtonTitle()}
		/>
	);

	const deleteButton = (
		<ActionButton
			item={item}
			type={ButtonType.Delete}
			onPress={props.onDelete}
			disabled={props.item.deleted}
			title={props.item.deleted ? _('Deleted') : _('Delete')}
		/>
	);
	const disableButton = <ActionButton item={item} onPress={props.onToggle} title={_('Disable')}/>;
	const enableButton = <ActionButton item={item} onPress={props.onToggle} title={_('Enable')}/>;
	const aboutButton = <ActionButton type={ButtonType.Link} item={item} onPress={props.onAboutPress} title={_('About')}/>;

	const renderRightEdgeButton = (buttonProps: { size: number }) => {
		if (!props.showInfoButton) return null;
		return (
			<PluginInfoButton
				{...buttonProps}
				themeId={props.themeId}
				item={props.item}
				onDelete={props.onDelete}
				onToggle={props.onToggle}
				onUpdate={props.onUpdate}
			/>
		);
	};

	const updateStateIsIdle = props.updateState !== UpdateState.Idle;

	return (
		<Card mode='outlined' style={{ margin: 8, opacity: props.isCompatible ? undefined : 0.7 }} testID='plugin-card'>
			<Card.Title
				title={<PluginTitle manifest={item.manifest} />}
				subtitle={manifest.description}
				right={renderRightEdgeButton}
			/>
			<Card.Content>
				<PluginChips
					themeId={props.themeId}
					item={props.item}
					hasErrors={props.hasErrors}
					isCompatible={props.isCompatible}
				/>
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
