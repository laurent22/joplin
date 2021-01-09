import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import ToggleButton from '../../../lib/ToggleButton/ToggleButton';
import Button, { ButtonLevel } from '../../../Button/Button';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';

export enum InstallState {
	NotInstalled = 1,
	Installing = 2,
	Installed = 3,
}

interface Props {
	item?: PluginItem;
	manifest?: PluginManifest;
	installState?: InstallState;
	themeId: number;
	onToggle?: Function;
	onDelete?: Function;
	onInstall?: Function;
}

function manifestToItem(manifest: PluginManifest): PluginItem {
	return {
		id: manifest.id,
		name: manifest.name,
		description: manifest.description,
		enabled: true,
		deleted: false,
		devMode: false,
	};
}

export interface PluginItem {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	deleted: boolean;
	devMode: boolean;
}

const CellRoot = styled.div`
	display: flex;
	background-color: ${props => props.theme.backgroundColor};
	flex-direction: column;
	align-items: flex-start;
	padding: 15px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 6px;
	width: 250px;
	margin-right: 20px;
	margin-bottom: 20px;
	box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
`;

const CellTop = styled.div`
	display: flex;
	flex-direction: row;
	width: 100%;
	margin-bottom: 10px;
`;

const CellContent = styled.div`
	display: flex;
	margin-bottom: 10px;
	flex: 1;
`;

const CellFooter = styled.div`
	display: flex;
	flex-direction: row;
`;

const DevModeLabel = styled.div`
	border: 1px solid ${props => props.theme.color};
	border-radius: 4px;
	padding: 4px 6px;
	font-size: ${props => props.theme.fontSize * 0.75}px;
	color: ${props => props.theme.color};
`;

const StyledName = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: ${props => props.theme.fontSize}px;
	font-weight: bold;
	flex: 1;
`;

const StyledDescription = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize}px;
	line-height: 1.6em;
`;

export default function(props: Props) {
	const item = props.item ? props.item : manifestToItem(props.manifest);

	// For plugins in dev mode things like enabling/disabling or
	// uninstalling them doesn't make sense, as that should be done by
	// adding/removing them from wherever they were loaded from.

	function renderToggleButton() {
		if (!props.onToggle) return null;

		if (item.devMode) {
			return <DevModeLabel>DEV</DevModeLabel>;
		}

		return <ToggleButton
			themeId={props.themeId}
			value={item.enabled}
			onToggle={() => props.onToggle({ item })}
		/>;
	}

	function renderDeleteButton() {
		if (!props.onDelete) return null;
		return <Button level={ButtonLevel.Secondary} onClick={() => props.onDelete({ item })} title={_('Delete')}/>;
	}

	function renderInstallButton() {
		if (!props.onInstall) return null;

		let title = _('Install');
		if (props.installState === InstallState.Installing) title = _('Installing...');
		if (props.installState === InstallState.Installed) title = _('Installed');

		return <Button
			level={ButtonLevel.Secondary}
			disabled={props.installState !== InstallState.NotInstalled}
			onClick={() => props.onInstall({ item })}
			title={title}
		/>;
	}

	function renderFooter() {
		if (item.devMode) return null;

		return (
			<CellFooter>
				{renderDeleteButton()}
				{renderInstallButton()}
				<div style={{ display: 'flex', flex: 1 }}/>
			</CellFooter>
		);
	}

	return (
		<CellRoot>
			<CellTop>
				<StyledName mb={'5px'}>{item.name} {item.deleted ? '(Deleted)' : ''}</StyledName>
				{renderToggleButton()}
			</CellTop>
			<CellContent>
				<StyledDescription>{item.description}</StyledDescription>
			</CellContent>
			{renderFooter()}
		</CellRoot>
	);
}
