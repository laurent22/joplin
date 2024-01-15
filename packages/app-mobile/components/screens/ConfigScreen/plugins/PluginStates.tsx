import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import * as React from 'react';
import repoApi from './utils/repoApi';
import Logger from '@joplin/utils/Logger';
import { useCallback, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { View } from 'react-native';
import { Banner, Button, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginToggle from './PluginToggle';
import SearchPlugins from './SearchPlugins';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { ItemEvent } from '@joplin/lib/components/shared/config/plugins/types';
import NavService from '@joplin/lib/services/NavService';

interface Props {
	themeId: number;
	styles: ConfigScreenStyles;
	pluginSettings: string;
	settingsSearchQuery?: string;

	updatePluginStates: (settingValue: PluginSettings)=> void;
	shouldShowBasedOnSearchQuery: ((relatedText: string|string[])=> boolean)|null;
}

const logger = Logger.create('PluginStates');

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

const PluginStates: React.FC<Props> = props => {
	const [repoApiError, setRepoApiError] = useState(null);
	const [repoApiLoaded, setRepoApiLoaded] = useState(false);
	const [reloadRepoConter, setRepoReloadCounter] = useState(0);
	const [updateablePluginIds, setUpdatablePluginIds] = useState<Record<string, boolean>>({});

	useAsyncEffect(async event => {
		if (reloadRepoConter > 0) {
			logger.info(`Reloading the plugin repository -- try #${reloadRepoConter + 1}`);
		}

		setRepoApiError(null);
		try {
			await repoApi().initialize();
		} catch (error) {
			logger.error(error);
			setRepoApiError(error);
		}
		if (!event.cancelled) {
			setRepoApiLoaded(true);

			const manifests = Object.values(PluginService.instance().plugins)
				.filter(plugin => !plugin.builtIn && !plugin.devMode)
				.map(plugin => {
					return plugin.manifest;
				});
			const updateablePluginIds = await repoApi().canBeUpdatedPlugins(manifests, pluginService.appVersion);

			const conv: Record<string, boolean> = {};
			for (const id of updateablePluginIds) {
				conv[id] = true;
			}
			setUpdatablePluginIds(conv);
		}
	}, [setRepoApiError, reloadRepoConter]);

	const reloadPluginRepo = useCallback(() => {
		setRepoReloadCounter(reloadRepoConter + 1);
	}, [reloadRepoConter, setRepoReloadCounter]);

	const renderRepoApiStatus = () => {
		if (repoApiLoaded) {
			if (!repoApi().isUsingDefaultContentUrl) {
				const url = new URL(repoApi().contentBaseUrl);
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
	for (const key in pluginService.plugins) {
		const plugin = pluginService.plugins[key];

		if (!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(plugin.manifest.name)) {
			installedPluginCards.push(
				<PluginToggle
					key={`plugin-${key}`}
					pluginId={plugin.id}
					styles={props.styles}
					pluginSettings={props.pluginSettings}
					updateablePluginIds={updateablePluginIds}
					updatePluginStates={props.updatePluginStates}
					onShowPluginLog={onShowPluginLog}
				/>,
			);
		}
	}

	const isIos = shim.mobilePlatform() === 'ios';
	const isDevMode = Setting.value('env') === 'dev';

	const showSearch = (
		(!isIos || isDevMode)
		&& (
			!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(searchInputSearchText())
		)
	);

	const renderIosSearchWarning = () => {
		if (!isIos || !showSearch) return null;

		return <Banner visible={true} icon='information'>{'Note: Plugin search is usually disabled on iOS (and only enabled in dev mode).'}</Banner>;
	};

	const searchComponent = (
		<>
			<SearchPlugins
				pluginSettings={props.pluginSettings}
				themeId={props.themeId}
				updatePluginStates={props.updatePluginStates}
				repoApiInitialized={repoApiLoaded}
			/>
		</>
	);

	return (
		<View>
			{renderRepoApiStatus()}
			{renderIosSearchWarning()}
			{installedPluginCards}
			{showSearch ? searchComponent : null}
		</View>
	);
};

export default PluginStates;
