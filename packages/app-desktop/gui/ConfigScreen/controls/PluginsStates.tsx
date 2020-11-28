import * as React from 'react';
import { useCallback, useMemo } from 'react';
import PluginService, { defaultPluginSetting, Plugins, PluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import ToggleButton from '../../lib/ToggleButton/ToggleButton';
import Button, { ButtonLevel } from '../../Button/Button';
import bridge from '../../../services/bridge';
import produce from 'immer';

const Root = styled.div`
	display: flex;
	flex-direction: column;
`;

const TableRoot = styled.div`
	display: flex;
	flex-wrap: wrap;
`;

const InstallButton = styled(Button)`
	margin-bottom: 10px;
`;

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

interface Props {
	value: any;
	themeId: number;
	onChange: Function;
}

interface CellProps {
	item: PluginItem;
	themeId: number;
	onToggle: Function;
	onDelete: Function;
}

interface PluginItem {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	deleted: boolean;
	devMode: boolean;
}

function Cell(props: CellProps) {
	const { item } = props;

	// For plugins in dev mode things like enabling/disabling or
	// uninstalling them doesn't make sense, as that should be done by
	// adding/removing them from wherever they were loaded from.

	function renderToggleButton() {
		if (item.devMode) {
			return <DevModeLabel>DEV</DevModeLabel>;
		}

		return <ToggleButton
			themeId={props.themeId}
			value={item.enabled}
			onToggle={() => props.onToggle({ item: props.item })}
		/>;
	}

	function renderFooter() {
		if (item.devMode) return null;

		return (
			<CellFooter>
				<Button level={ButtonLevel.Secondary} onClick={() => props.onDelete({ item: props.item })} title={_('Delete')}/>
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

function usePluginItems(plugins: Plugins, settings: PluginSettings): PluginItem[] {
	return useMemo(() => {
		const output: PluginItem[] = [];

		for (const pluginId in plugins) {
			const plugin = plugins[pluginId];

			const setting: PluginSetting = {
				...defaultPluginSetting(),
				...settings[pluginId],
			};

			output.push({
				id: pluginId,
				name: plugin.manifest.name,
				description: plugin.manifest.description,
				enabled: setting.enabled,
				deleted: setting.deleted,
				devMode: plugin.devMode,
			});
		}

		output.sort((a: PluginItem, b: PluginItem) => {
			return a.name < b.name ? -1 : +1;
		});

		return output;
	}, [plugins, settings]);
}

export default function(props: Props) {
	const pluginService = PluginService.instance();

	const pluginSettings = useMemo(() => {
		return pluginService.unserializePluginSettings(props.value);
	}, [props.value]);

	const onDelete = useCallback(async (event: any) => {
		const item: PluginItem = event.item;
		const confirm = await bridge().showConfirmMessageBox(_('Delete plugin "%s"?', item.name));
		if (!confirm) return;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.id]) draft[item.id] = defaultPluginSetting();
			draft[item.id].deleted = true;
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
	}, [pluginSettings, props.onChange]);

	const onToggle = useCallback((event: any) => {
		const item: PluginItem = event.item;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.id]) draft[item.id] = defaultPluginSetting();
			draft[item.id].enabled = !draft[item.id].enabled;
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
	}, [pluginSettings, props.onChange]);

	const onInstall = useCallback(async () => {
		const result = bridge().showOpenDialog({
			filters: [{ name: 'Joplin Plugin Archive', extensions: ['jpl'] }],
		});

		const filePath = result && result.length ? result[0] : null;
		if (!filePath) return;

		const plugin = await pluginService.installPlugin(filePath);

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			draft[plugin.manifest.id] = defaultPluginSetting();
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
	}, [pluginSettings, props.onChange]);

	function renderCells(items: PluginItem[]) {
		const output = [];

		for (const item of items) {
			if (item.deleted) continue;

			output.push(<Cell
				key={item.id}
				item={item}
				themeId={props.themeId}
				onDelete={onDelete}
				onToggle={onToggle}
			/>);
		}

		return output;
	}

	const pluginItems = usePluginItems(pluginService.plugins, pluginSettings);

	return (
		<Root>
			<div style={{ display: 'flex', flexDirection: 'row' }}>
				<InstallButton level={ButtonLevel.Primary} onClick={onInstall} title={_('Install plugin')}/>
				<div style={{ display: 'flex', flex: 1 }}/>
			</div>
			<TableRoot>
				{renderCells(pluginItems)}
			</TableRoot>
		</Root>
	);
}
