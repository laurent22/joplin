import * as React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { View } from 'react-native';
import { Banner, Button, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginToggle from './PluginToggle';
import SearchPlugins from './SearchPlugins';
import { ItemEvent } from '@joplin/lib/components/shared/config/plugins/types';
import NavService from '@joplin/lib/services/NavService';
import useRepoApi from './utils/useRepoApi';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

interface Props {
	themeId: number;
	styles: ConfigScreenStyles;
	pluginSettings: SerializedPluginSettings;
	settingsSearchQuery?: string;

	updatePluginStates: (settingValue: PluginSettings)=> void;
	shouldShowBasedOnSearchQuery: ((relatedText: string|string[])=> boolean)|null;
}

// Text used for determining whether to display the setting or not.
const searchInputSearchText = () => [_('Search'), _('Plugin search')];
export const getSearchText = () => {
	const plugins = PluginService.instance().plugins;
	const searchText = [];
	for (const key in plugins) {
		const plugin = plugins[key];
		searchText.push(plugin.manifest.name);
	}
	searchText.push(...searchInputSearchText());
	return searchText;
};

const logger = Logger.create('PluginStates');

// Loaded plugins: All plugins with available manifests.
const useLoadedPluginIds = (pluginSettings: SerializedPluginSettings) => {
	const allPluginIds = useMemo(() => {
		return Object.keys(
			PluginService.instance().unserializePluginSettings(pluginSettings),
		);
	}, [pluginSettings]);

	const [pluginReloadCounter, setPluginReloadCounter] = useState(0);
	const loadedPluginIds = useMemo(() => {
		if (pluginReloadCounter > 0) {
			logger.debug(`Not all plugins were loaded in the last render. Re-loading (try ${pluginReloadCounter})`);
		}

		const pluginService = PluginService.instance();
		return allPluginIds.filter(id => !!pluginService.plugins[id]);
	}, [allPluginIds, pluginReloadCounter]);
	const hasLoadingPlugins = loadedPluginIds.length !== allPluginIds.length;

	// Force a re-render if not all plugins have available metadata. This can happen
	// if plugins are still loading.
	const pluginReloadCounterRef = useRef(0);
	pluginReloadCounterRef.current = pluginReloadCounter;
	const timeoutRef = useRef(null);
	if (hasLoadingPlugins && !timeoutRef.current) {
		timeoutRef.current = shim.setTimeout(() => {
			timeoutRef.current = null;
			setPluginReloadCounter(pluginReloadCounterRef.current + 1);
		}, 1000);
	}

	return loadedPluginIds;
};

const PluginStates: React.FC<Props> = props => {
	const [repoApiError, setRepoApiError] = useState(null);
	const [repoApiLoaded, setRepoApiLoaded] = useState(false);
	const [reloadRepoCounter, setRepoReloadCounter] = useState(0);
	const [updatablePluginIds, setUpdatablePluginIds] = useState<Record<string, boolean>>({});

	const onRepoApiLoaded = useCallback(async (repoApi: RepositoryApi) => {
		const manifests = Object.values(PluginService.instance().plugins)
			.filter(plugin => !plugin.builtIn && !plugin.devMode)
			.map(plugin => {
				return plugin.manifest;
			});
		const updatablePluginIds = await repoApi.canBeUpdatedPlugins(manifests);

		const conv: Record<string, boolean> = {};
		for (const id of updatablePluginIds) {
			conv[id] = true;
		}
		setRepoApiLoaded(true);
		setUpdatablePluginIds(conv);
	}, []);
	const repoApi = useRepoApi({ setRepoApiError, onRepoApiLoaded, reloadRepoCounter });

	const reloadPluginRepo = useCallback(() => {
		setRepoReloadCounter(reloadRepoCounter + 1);
	}, [reloadRepoCounter, setRepoReloadCounter]);

	const renderRepoApiStatus = () => {
		if (repoApiLoaded) {
			if (!repoApi.isUsingDefaultContentUrl) {
				const url = new URL(repoApi.contentBaseUrl);
				return (
					<Banner visible={true} icon='alert'>{_('Content provided by: %s', url.hostname)}</Banner>
				);
			}

			return null;
		}

		if (repoApiError) {
			return <View style={{ flexDirection: 'row' }}>
				<Text>{_('Plugin repository failed to load')}</Text>
				<Button onPress={reloadPluginRepo}>{_('Retry')}</Button>
			</View>;
		} else {
			return <Text>{_('Loading plugin repository...')}</Text>;
		}
	};

	const onShowPluginLog = useCallback((event: ItemEvent) => {
		const pluginId = event.item.manifest.id;
		void NavService.go('Log', { defaultFilter: pluginId });
	}, []);

	const installedPluginCards = [];
	const pluginService = PluginService.instance();

	const pluginIds = useLoadedPluginIds(props.pluginSettings);
	for (const pluginId of pluginIds) {
		const plugin = pluginService.plugins[pluginId];

		if (!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(plugin.manifest.name)) {
			installedPluginCards.push(
				<PluginToggle
					key={`plugin-${pluginId}`}
					themeId={props.themeId}
					pluginId={pluginId}
					styles={props.styles}
					pluginSettings={props.pluginSettings}
					updatablePluginIds={updatablePluginIds}
					updatePluginStates={props.updatePluginStates}
					onShowPluginLog={onShowPluginLog}
					repoApi={repoApi}
				/>,
			);
		}
	}

	const showSearch = (
		!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(searchInputSearchText())
	);

	const searchComponent = (
		<SearchPlugins
			pluginSettings={props.pluginSettings}
			themeId={props.themeId}
			onUpdatePluginStates={props.updatePluginStates}
			repoApiInitialized={repoApiLoaded}
			repoApi={repoApi}
		/>
	);

	return (
		<View>
			{renderRepoApiStatus()}
			{installedPluginCards}
			{showSearch ? searchComponent : null}
		</View>
	);
};

export default PluginStates;
