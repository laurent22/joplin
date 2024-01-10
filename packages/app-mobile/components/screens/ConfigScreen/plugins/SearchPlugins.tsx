
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import Logger from '@joplin/utils/Logger';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import PluginBox, { InstallState, PluginItem } from './PluginBox';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import repoApi from './utils/repoApi';

interface Props {
	themeId: number;
	pluginSettings: string;
	updatePluginStates: (states: PluginSettings)=>void;
}

const logger = Logger.create('SearchPlugins');

const PluginSearch: React.FC<Props> = props => {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResultManifests, setSearchResultManifests] = useState<PluginManifest[]>([]);

	useAsyncEffect(async event => {
		if (!searchQuery) {
			setSearchResultManifests([]);
		} else {
			const results = await repoApi().search(searchQuery);
			if (event.cancelled) return;

			setSearchResultManifests(results);
		}
	}, [searchQuery, setSearchResultManifests]);

	const [ repoApiError, setRepoApiError ] = useState(null);
	const [ repoApiLoaded, setRepoApiLoaded ] = useState(false);

	useAsyncEffect(async event => {
		setRepoApiError(null);
		try {
			await repoApi().initialize();
		} catch (error) {
			logger.error(error);
			setRepoApiError(error);
		}
		if (!event.cancelled) {
			setRepoApiLoaded(true);
		}
	}, [setRepoApiError]);

	const [ installingPluginsIds, setInstallingPluginIds ] = useState<Record<string, boolean>>({});

	const pluginSettings = useMemo(() => {
		return { ...PluginService.instance().unserializePluginSettings(props.pluginSettings) };
	}, [props.pluginSettings]);

	const searchResults = useMemo(() => {
		return searchResultManifests.map(manifest => {
			const settings = pluginSettings[manifest.id];

			let installState = InstallState.NotInstalled;
			if (settings && !settings.deleted) {
				installState = InstallState.Installed;
			}
			if (installingPluginsIds[manifest.id]) {
				installState = InstallState.Installing;
			}

			return {
				manifest,
				enabled: settings && settings.enabled,
				deleted: settings && !settings.deleted,
				installState,
			};
		});
	}, [searchResultManifests, installingPluginsIds]);


	const installPlugin = useCallback((item: PluginItem) => {
		setInstallingPluginIds({...installingPluginsIds, [item.manifest.id]: true});
	}, [installingPluginsIds, setInstallingPluginIds]);

	const renderResult = useCallback(({item}: {item: PluginItem}) => {
		const manifest = item.manifest;

		return (
			<PluginBox
				key={manifest.id}
				item={item}
				devMode={false}
				builtIn={false}
				isCompatible={PluginService.instance().isCompatible(manifest.app_min_version)}
				onInstall={installPlugin}
			/>
		);
	}, [installPlugin]);

	return (
		<View style={{ flexDirection: 'column' }}>
			<Searchbar
				placeholder={_('Search')}
				onChangeText={setSearchQuery}
				value={searchQuery}
				editable={repoApiLoaded}
			/>
			<View>{repoApiError ? <Text>{repoApiError}</Text> : null}</View>
			<FlatList
				data={searchResults}
				renderItem={renderResult}
				keyExtractor={item => item.manifest.id}
				scrollEnabled={false}
			/>
		</View>
	);
};

export default PluginSearch;