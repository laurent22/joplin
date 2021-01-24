import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PluginService, { defaultPluginSetting, Plugins, PluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import SearchPlugins from './SearchPlugins';
import PluginBox, { UpdateState } from './PluginBox';
import Button, { ButtonLevel } from '../../../Button/Button';
import bridge from '../../../../services/bridge';
import produce from 'immer';
import { OnChangeEvent } from '../../../lib/SearchInput/SearchInput';
import { PluginItem } from './PluginBox';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import Setting from '@joplin/lib/models/Setting';
import useOnInstallHandler, { OnPluginSettingChangeEvent } from './useOnInstallHandler';
const { space } = require('styled-system');

const maxWidth: number = 320;

const Root = styled.div`
	display: flex;
	flex-direction: column;
`;

const UserPluginsRoot = styled.div`
	${space}
	display: flex;
	flex-wrap: wrap;
`;

const ToolsButton = styled(Button)`
	margin-right: 6px;
`;

interface Props {
	value: any;
	themeId: number;
	onChange: Function;
	renderLabel: Function;
	renderDescription: Function;
	renderHeader: Function;
}

let repoApi_: RepositoryApi = null;

function repoApi(): RepositoryApi {
	if (repoApi_) return repoApi_;
	repoApi_ = new RepositoryApi('https://github.com/joplin/plugins', Setting.value('tempDir'));
	// repoApi_ = new RepositoryApi('/Users/laurent/src/joplin-plugins-test', Setting.value('tempDir'));
	return repoApi_;
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
				manifest: plugin.manifest,
				enabled: setting.enabled,
				deleted: setting.deleted,
				devMode: plugin.devMode,
				hasBeenUpdated: setting.hasBeenUpdated,
			});
		}

		output.sort((a: PluginItem, b: PluginItem) => {
			return a.manifest.name < b.manifest.name ? -1 : +1;
		});

		return output;
	}, [plugins, settings]);
}

export default function(props: Props) {
	const [searchQuery, setSearchQuery] = useState('');
	const [manifestsLoaded, setManifestsLoaded] = useState<boolean>(false);
	const [updatingPluginsIds, setUpdatingPluginIds] = useState<Record<string, boolean>>({});
	const [canBeUpdatedPluginIds, setCanBeUpdatedPluginIds] = useState<Record<string, boolean>>({});

	const pluginService = PluginService.instance();

	const pluginSettings = useMemo(() => {
		return pluginService.unserializePluginSettings(props.value);
	}, [props.value]);

	const pluginItems = usePluginItems(pluginService.plugins, pluginSettings);

	useEffect(() => {
		let cancelled = false;
		async function fetchManifests() {
			await repoApi().loadManifests();
			if (cancelled) return;
			setManifestsLoaded(true);
		}

		void fetchManifests();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!manifestsLoaded) return () => {};

		let cancelled = false;

		async function fetchPluginIds() {
			const pluginIds = await repoApi().canBeUpdatedPlugins(pluginItems as any);
			if (cancelled) return;
			const conv: Record<string, boolean> = {};
			pluginIds.forEach(id => conv[id] = true);
			setCanBeUpdatedPluginIds(conv);
		}

		void fetchPluginIds();

		return () => {
			cancelled = true;
		};
	}, [manifestsLoaded, pluginItems]);

	const onDelete = useCallback(async (event: any) => {
		const item: PluginItem = event.item;
		const confirm = await bridge().showConfirmMessageBox(_('Delete plugin "%s"?', item.manifest.name));
		if (!confirm) return;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.manifest.id]) draft[item.manifest.id] = defaultPluginSetting();
			draft[item.manifest.id].deleted = true;
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
	}, [pluginSettings, props.onChange]);

	const onToggle = useCallback((event: any) => {
		const item: PluginItem = event.item;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.manifest.id]) draft[item.manifest.id] = defaultPluginSetting();
			draft[item.manifest.id].enabled = !draft[item.manifest.id].enabled;
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

	const onBrowsePlugins = useCallback(() => {
		bridge().openExternal('https://github.com/joplin/plugins/blob/master/README.md#plugins');
	}, []);

	const onPluginSettingsChange = useCallback((event: OnPluginSettingChangeEvent) => {
		props.onChange({ value: pluginService.serializePluginSettings(event.value) });
	}, []);

	const onUpdate = useOnInstallHandler(setUpdatingPluginIds, pluginSettings, repoApi, onPluginSettingsChange, true);

	const onToolsClick = useCallback(async () => {
		const template = [
			{
				label: _('Browse all plugins'),
				click: onBrowsePlugins,
			},
			{
				label: _('Install from file'),
				click: onInstall,
			},
		];

		const menu = bridge().Menu.buildFromTemplate(template);
		menu.popup(bridge().window());
	}, [onInstall, onBrowsePlugins]);

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

			const isUpdating = updatingPluginsIds[item.manifest.id];
			const onUpdateHandler = canBeUpdatedPluginIds[item.manifest.id] ? onUpdate : null;

			let updateState = UpdateState.Idle;
			if (onUpdateHandler) updateState = UpdateState.CanUpdate;
			if (isUpdating) updateState = UpdateState.Updating;
			if (item.hasBeenUpdated) updateState = UpdateState.HasBeenUpdated;

			output.push(<PluginBox
				key={item.manifest.id}
				item={item}
				themeId={props.themeId}
				updateState={updateState}
				isCompatible={PluginService.instance().isCompatible(item.manifest.app_min_version)}
				onDelete={onDelete}
				onToggle={onToggle}
				onUpdate={onUpdateHandler}
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

	function renderSearchArea() {
		return (
			<div style={{ marginBottom: 20 }}>
				<SearchPlugins
					disabled={!manifestsLoaded}
					maxWidth={maxWidth}
					themeId={props.themeId}
					searchQuery={searchQuery}
					pluginSettings={pluginSettings}
					onSearchQueryChange={onSearchQueryChange}
					onPluginSettingsChange={onSearchPluginSettingsChange}
					renderDescription={props.renderDescription}
					repoApi={repoApi}
				/>
			</div>
		);
	}

	function renderBottomArea() {
		if (searchQuery) return null;

		return (
			<div>
				<div style={{ display: 'flex', flexDirection: 'row', maxWidth }}>
					<ToolsButton tooltip={_('Plugin tools')} iconName="fas fa-cog" level={ButtonLevel.Secondary} onClick={onToolsClick}/>
					<div style={{ display: 'flex', flex: 1 }}>
						{props.renderHeader(props.themeId, _('Manage your plugins'))}
					</div>
				</div>
				{renderUserPlugins(pluginItems)}
			</div>
		);
	}

	return (
		<Root>
			{renderSearchArea()}
			{renderBottomArea()}
		</Root>
	);
}
