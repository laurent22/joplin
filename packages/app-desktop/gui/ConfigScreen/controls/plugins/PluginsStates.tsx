import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PluginService, { defaultPluginSetting, Plugins, PluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { _ } from '@joplin/lib/locale';
import styled from 'styled-components';
import SearchPlugins from './SearchPlugins';
import PluginBox, { UpdateState } from './PluginBox';
import Button, { ButtonLevel, ButtonSize } from '../../../Button/Button';
import bridge from '../../../../services/bridge';
import produce from 'immer';
import { OnChangeEvent } from '../../../lib/SearchInput/SearchInput';
import { PluginItem, ItemEvent, OnPluginSettingChangeEvent } from '@joplin/lib/components/shared/config/plugins/types';
import RepositoryApi, { InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import useOnInstallHandler from '@joplin/lib/components/shared/config/plugins/useOnInstallHandler';
import useOnDeleteHandler from '@joplin/lib/components/shared/config/plugins/useOnDeleteHandler';
import Logger from '@joplin/utils/Logger';
import StyledMessage from '../../../style/StyledMessage';
import StyledLink from '../../../style/StyledLink';
import SettingHeader from '../SettingHeader';
import SettingDescription from '../SettingDescription';
const { space } = require('styled-system');

const logger = Logger.create('PluginState');

const maxWidth = 320;

const Root = styled.div`
	display: flex;
	flex-direction: column;
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const UserPluginsRoot = styled.div<any>`
	${space}
	display: flex;
	flex-wrap: wrap;
`;

const ToolsButton = styled(Button)`
	margin-right: 6px;
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const RepoApiErrorMessage = styled(StyledMessage)<any>`
	max-width: ${props => props.maxWidth}px;
	margin-bottom: 10px;
`;

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onChange: Function;
}

let repoApi_: RepositoryApi = null;

function repoApi(): RepositoryApi {
	if (repoApi_) return repoApi_;
	const appInfo = { type: AppType.Desktop, version: PluginService.instance().appVersion };
	repoApi_ = RepositoryApi.ofDefaultJoplinRepo(Setting.value('tempDir'), appInfo, InstallMode.Default);
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
				installed: true,
				enabled: setting.enabled,
				deleted: setting.deleted,
				devMode: plugin.devMode,
				builtIn: plugin.builtIn,
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
	const [repoApiError, setRepoApiError] = useState<Error>(null);
	const [fetchManifestTime, setFetchManifestTime] = useState<number>(Date.now());

	const pluginService = PluginService.instance();

	const pluginSettings = useMemo(() => {
		return pluginService.unserializePluginSettings(props.value);
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.value]);

	const pluginItems = usePluginItems(pluginService.plugins, pluginSettings);

	useEffect(() => {
		let cancelled = false;
		async function fetchManifests() {
			setManifestsLoaded(false);
			setRepoApiError(null);

			let loadError: Error = null;
			try {
				await repoApi().initialize();
			} catch (error) {
				logger.error(error);
				loadError = error;
			}

			if (cancelled) return;

			if (loadError) {
				setManifestsLoaded(false);
				setRepoApiError(loadError);
			} else {
				setManifestsLoaded(true);
			}
		}

		void fetchManifests();

		return () => {
			cancelled = true;
		};
	}, [fetchManifestTime]);

	useEffect(() => {
		if (!manifestsLoaded) return () => {};

		let cancelled = false;

		async function fetchPluginIds() {
			// Built-in plugins can't be updated from the main repoApi
			const nonDefaultPlugins = pluginItems
				.filter(plugin => !plugin.builtIn)
				.map(p => p.manifest);

			const pluginIds = await repoApi().canBeUpdatedPlugins(nonDefaultPlugins);
			if (cancelled) return;

			const conv: Record<string, boolean> = {};
			for (const id of pluginIds) {
				conv[id] = true;
			}
			setCanBeUpdatedPluginIds(conv);
		}

		void fetchPluginIds();

		return () => {
			cancelled = true;
		};
	}, [manifestsLoaded, pluginItems, pluginService.appVersion]);

	const onToggle = useCallback((event: ItemEvent) => {
		const item = event.item;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.manifest.id]) draft[item.manifest.id] = defaultPluginSetting();
			draft[item.manifest.id].enabled = !draft[item.manifest.id].enabled;
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [pluginSettings, props.onChange]);

	const onInstall = useCallback(async () => {
		const result = await bridge().showOpenDialog({
			filters: [{ name: 'Joplin Plugin Archive', extensions: ['jpl'] }],
		});

		const filePath = result && result.length ? result[0] : null;
		if (!filePath) return;

		const plugin = await pluginService.installPlugin(filePath);

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			draft[plugin.manifest.id] = defaultPluginSetting();
		});

		props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [pluginSettings, props.onChange]);

	const onBrowsePlugins = useCallback(() => {
		void bridge().openExternal('https://joplinapp.org/plugins/');
	}, []);

	const onPluginSettingsChange = useCallback((event: OnPluginSettingChangeEvent) => {
		props.onChange({ value: pluginService.serializePluginSettings(event.value) });
	}, [pluginService, props.onChange]);

	const pluginSettingsRef = useRef(pluginSettings);
	pluginSettingsRef.current = pluginSettings;

	const onDelete = useOnDeleteHandler(pluginSettingsRef, onPluginSettingsChange, false);
	const onUpdate = useOnInstallHandler(setUpdatingPluginIds, pluginSettingsRef, repoApi, onPluginSettingsChange, true);

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
		menu.popup({ window: bridge().mainWindow() });
	}, [onInstall, onBrowsePlugins]);

	const onSearchQueryChange = useCallback((event: OnChangeEvent) => {
		setSearchQuery(event.value);
	}, []);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onSearchPluginSettingsChange = useCallback((event: any) => {
		props.onChange({ value: pluginService.serializePluginSettings(event.value) });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
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
				isCompatible={PluginService.instance().isCompatible(item.manifest)}
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
					<SettingDescription text={_('You do not have any installed plugin.')}/>
				</UserPluginsRoot>
			);
		} else {
			const nonDefaultPlugins = pluginItems.filter(item => !item.builtIn);
			const defaultPlugins = pluginItems.filter(item => item.builtIn);
			return (
				<>
					<UserPluginsRoot>
						{renderCells(nonDefaultPlugins)}
					</UserPluginsRoot>
					<UserPluginsRoot>
						{renderCells(defaultPlugins)}
					</UserPluginsRoot>
				</>
			);
		}
	}

	function renderSearchArea() {
		return (
			<div style={{ marginBottom: 0 }}>
				<SearchPlugins
					disabled={!manifestsLoaded}
					maxWidth={maxWidth}
					themeId={props.themeId}
					searchQuery={searchQuery}
					pluginSettings={pluginSettings}
					onSearchQueryChange={onSearchQueryChange}
					onPluginSettingsChange={onSearchPluginSettingsChange}
					repoApi={repoApi}
				/>
			</div>
		);
	}

	function renderRepoApiError() {
		if (!repoApiError) return null;

		return <RepoApiErrorMessage maxWidth={maxWidth} type="error">{_('Could not connect to plugin repository.')}<br/><br/>- <StyledLink href="#" onClick={() => { setFetchManifestTime(Date.now()); }}>{_('Try again')}</StyledLink><br/><br/>- <StyledLink href="#" onClick={onBrowsePlugins}>{_('Browse all plugins')}</StyledLink></RepoApiErrorMessage>;
	}

	function renderBottomArea() {
		if (searchQuery) return null;

		return (
			<div>
				{renderRepoApiError()}
				<div style={{ display: 'flex', flexDirection: 'row', maxWidth }}>
					<ToolsButton size={ButtonSize.Small} tooltip={_('Plugin tools')} iconName="fas fa-cog" level={ButtonLevel.Secondary} onClick={onToolsClick}/>
					<div style={{ display: 'flex', flex: 1 }}>
						<SettingHeader text={_('Manage your plugins')}/>
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
