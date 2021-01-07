import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import PluginService, { defaultPluginSetting, Plugins, PluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import SearchPlugins from './SearchPlugins';
import PluginBox from './PluginBox';
// import Button, { ButtonLevel } from '../../../Button/Button';
import bridge from '../../../../services/bridge';
import produce from 'immer';
import { OnChangeEvent } from '../../../lib/SearchInput/SearchInput';
import { PluginItem } from './PluginBox';
const { space } = require('styled-system');

const Root = styled.div`
	display: flex;
	flex-direction: column;
`;

const UserPluginsRoot = styled.div`
	${space}
	display: flex;
	flex-wrap: wrap;
`;

// const InstallButton = styled(Button)``;

interface Props {
	value: any;
	themeId: number;
	onChange: Function;
	renderLabel: Function;
	renderDescription: Function;
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
	const [searchQuery, setSearchQuery] = useState('');

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

	// const onInstall = useCallback(async () => {
	// 	const result = bridge().showOpenDialog({
	// 		filters: [{ name: 'Joplin Plugin Archive', extensions: ['jpl'] }],
	// 	});

	// 	const filePath = result && result.length ? result[0] : null;
	// 	if (!filePath) return;

	// 	const plugin = await pluginService.installPlugin(filePath);

	// 	const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
	// 		draft[plugin.manifest.id] = defaultPluginSetting();
	// 	});

	// 	props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
	// }, [pluginSettings, props.onChange]);

	const onSearchQueryChange = useCallback((event: OnChangeEvent) => {
		setSearchQuery(event.value);
	}, []);

	const onSearchPluginSettingsChange = useCallback((event: any) => {
		props.onChange({ value: pluginService.serializePluginSettings(event.value) });
	}, [props.onChange]);

	function renderCells(items: PluginItem[]) {
		const output = [];

		for (const item of items) {
			if (item.deleted) continue;

			output.push(<PluginBox
				key={item.id}
				item={item}
				themeId={props.themeId}
				onDelete={onDelete}
				onToggle={onToggle}
			/>);
		}

		return output;
	}

	function renderUserPlugins(pluginItems: PluginItem[]) {
		const allDeleted = !pluginItems.find(it => it.deleted !== true);

		if (!pluginItems.length || allDeleted) {
			return (
				<UserPluginsRoot mb={'10px'}>
					{props.renderDescription(props.themeId, _('You do not have any installed plugin.'))}
				</UserPluginsRoot>
			);
		} else {
			return (
				<UserPluginsRoot>
					{renderCells(pluginItems)}
				</UserPluginsRoot>
			);
		}
	}

	function renderInstallFromFile(): any {
		return null;

		// Disabled for now since there are already options for developments,
		// and installing from file can be done by dropping the file in /plugins

		// return (
		// 	<div>
		// 		{props.renderLabel(props.themeId, _('Install plugin from file'))}
		// 		<InstallButton level={ButtonLevel.Primary} onClick={onInstall} title={_('Install plugin')}/>
		// 		<div style={{ display: 'flex', flex: 1 }}/>
		// 	</div>
		// );
	}

	const pluginItems = usePluginItems(pluginService.plugins, pluginSettings);

	return (
		<Root>
			<div style={{ marginBottom: 20 }}>
				{props.renderLabel(props.themeId, _('Search for plugins'))}
				<SearchPlugins
					themeId={props.themeId}
					searchQuery={searchQuery}
					pluginSettings={pluginSettings}
					onSearchQueryChange={onSearchQueryChange}
					onPluginSettingsChange={onSearchPluginSettingsChange}
					renderDescription={props.renderDescription}
				/>
			</div>

			{props.renderLabel(props.themeId, _('Manage your plugins'))}
			{renderUserPlugins(pluginItems)}

			{renderInstallFromFile()}
		</Root>
	);
}
