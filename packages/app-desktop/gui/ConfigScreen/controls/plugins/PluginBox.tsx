import * as React from 'react';
import { useCallback, useId, useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import ToggleButton from '../../../lib/ToggleButton/ToggleButton';
import Button, { ButtonLevel } from '../../../Button/Button';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import bridge from '../../../../services/bridge';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';

export enum InstallState {
	NotInstalled = 1,
	Installing = 2,
	Installed = 3,
}

export enum UpdateState {
	Idle = 1,
	CanUpdate = 2,
	Updating = 3,
	HasBeenUpdated = 4,
}

interface Props {
	item?: PluginItem;
	manifest?: PluginManifest;
	installState?: InstallState;
	updateState?: UpdateState;
	themeId: number;
	isCompatible: boolean;
	onToggle?: (event: ItemEvent)=> void;
	onDelete?: (event: ItemEvent)=> void;
	onInstall?: (event: ItemEvent)=> void;
	onUpdate?: (event: ItemEvent)=> void;
}

function manifestToItem(manifest: PluginManifest): PluginItem {
	return {
		manifest: manifest,
		installed: true,
		enabled: true,
		deleted: false,
		devMode: false,
		builtIn: false,
		hasBeenUpdated: false,
	};
}

const CellRoot = styled.div<{ isCompatible: boolean }>`
	display: flex;
	box-sizing: border-box;
	background-color: ${props => props.theme.backgroundColor};
	flex-direction: column;
	align-items: stretch;
	padding: 15px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 6px;
	width: 320px;
	margin-right: 20px;
	margin-bottom: 20px;
	box-shadow: 1px 1px 3px rgba(0,0,0,0.2);

	opacity: ${props => props.isCompatible ? '1' : '0.6'};
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

const NeedUpgradeMessage = styled.span`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
`;

const BoxedLabel = styled.div`
	border: 1px solid ${props => props.theme.color};
	border-radius: 4px;
	padding: 4px 6px;
	font-size: ${props => props.theme.fontSize * 0.75}px;
	color: ${props => props.theme.color};
	flex-grow: 0;
	height: min-content;
	margin-top: auto;
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const StyledNameAndVersion = styled.div<{ mb: any }>`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: ${props => props.theme.fontSize}px;
	font-weight: bold;
	padding-right: 5px;
	flex: 1;
`;

const StyledName = styled.a`
	color: ${props => props.theme.color};

	&:hover {
		text-decoration: underline;
	}
`;

const StyledVersion = styled.span`
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize * 0.9}px;
`;

const StyledDescription = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize}px;
	line-height: 1.6em;
`;

const RecommendedBadge = styled.a`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
	border: 1px solid ${props => props.theme.colorWarn};
	padding: 5px;
	border-radius: 50px;
	opacity: 0.8;
	
	&:hover {
		opacity: 1;
	}
`;

export default function(props: Props) {
	const item = useMemo(() => {
		return props.item ? props.item : manifestToItem(props.manifest);
	}, [props.item, props.manifest]);

	const onNameClick = useCallback(() => {
		const manifest = item.manifest;
		if (!manifest.homepage_url) return;
		void bridge().openExternal(manifest.homepage_url);
	}, [item]);

	const onRecommendedClick = useCallback(() => {
		void bridge().openExternal('https://github.com/joplin/plugins/blob/master/readme/recommended.md#recommended-plugins');
	}, []);

	// For plugins in dev mode things like enabling/disabling or
	// uninstalling them doesn't make sense, as that should be done by
	// adding/removing them from wherever they were loaded from.

	function renderToggleButton() {
		if (!props.onToggle) return null;

		if (item.devMode) {
			return <BoxedLabel>DEV</BoxedLabel>;
		}

		return <ToggleButton
			themeId={props.themeId}
			value={item.enabled}
			onToggle={() => props.onToggle({ item })}
			aria-label={_('Enabled')}
		/>;
	}

	function renderDeleteButton() {
		// Built-in plugins can only be disabled
		if (item.builtIn) return null;
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

	function renderUpdateButton() {
		if (!props.onUpdate) return null;

		let title = _('Update');
		if (props.updateState === UpdateState.Updating) title = _('Updating...');
		if (props.updateState === UpdateState.Idle) title = _('Updated');
		if (props.updateState === UpdateState.HasBeenUpdated) title = _('Updated');

		return <Button
			ml={1}
			level={ButtonLevel.Recommended}
			onClick={() => props.onUpdate({ item })}
			title={title}
			disabled={props.updateState === UpdateState.HasBeenUpdated}
		/>;
	}

	const renderDefaultPluginLabel = () => {
		if (item.builtIn) {
			return (
				<BoxedLabel>{_('Built-in')}</BoxedLabel>
			);
		}

		return null;
	};

	function renderFooter() {
		if (item.devMode) return null;

		if (!props.isCompatible) {
			return (
				<CellFooter>
					<NeedUpgradeMessage>
						{PluginService.instance().describeIncompatibility(item.manifest)}
					</NeedUpgradeMessage>
				</CellFooter>
			);
		}

		return (
			<CellFooter>
				{renderDeleteButton()}
				{renderInstallButton()}
				{renderUpdateButton()}
				<div style={{ display: 'flex', flex: 1 }}/>
				{renderDefaultPluginLabel()}
			</CellFooter>
		);
	}

	function renderRecommendedBadge() {
		if (props.onToggle) return null;
		if (!item.manifest._recommended) return null;
		return <RecommendedBadge href="#" title={_('The Joplin team has vetted this plugin and it meets our standards for security and performance.')} onClick={onRecommendedClick}><i className="fas fa-crown"></i></RecommendedBadge>;
	}

	const nameLabelId = useId();

	return (
		<CellRoot isCompatible={props.isCompatible} role='group' aria-labelledby={nameLabelId}>
			<CellTop>
				<StyledNameAndVersion mb={'5px'}>
					<StyledName onClick={onNameClick} href="#" style={{ marginRight: 5 }} id={nameLabelId}>
						{item.manifest.name} {item.deleted ? _('(%s)', 'Deleted') : ''}
					</StyledName>
					<StyledVersion>v{item.manifest.version}</StyledVersion>
				</StyledNameAndVersion>
				{renderToggleButton()}
				{renderRecommendedBadge()}
			</CellTop>
			<CellContent>
				<StyledDescription>{item.manifest.description}</StyledDescription>
			</CellContent>
			{renderFooter()}
		</CellRoot>
	);
}
