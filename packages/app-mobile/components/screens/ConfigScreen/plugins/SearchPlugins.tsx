import * as React from 'react';

import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import PluginBox, { InstallState } from './PluginBox';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import useInstallHandler from '@joplin/lib/components/shared/config/plugins/useOnInstallHandler';
import { OnPluginSettingChangeEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';

interface Props {
	themeId: number;
	pluginSettings: SerializedPluginSettings;
	repoApiInitialized: boolean;
	onUpdatePluginStates: (states: PluginSettings)=> void;
	repoApi: RepositoryApi;
}

interface SearchResultRecord {
	id: string;
	item: PluginItem;
	installState: InstallState;
}

const PluginSearch: React.FC<Props> = props => {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResultManifests, setSearchResultManifests] = useState<PluginManifest[]>([]);

	useAsyncEffect(async event => {
		if (!searchQuery || !props.repoApiInitialized) {
			setSearchResultManifests([]);
		} else {
			const results = await props.repoApi.search(searchQuery);
			if (event.cancelled) return;

			setSearchResultManifests(results);
		}
	}, [searchQuery, props.repoApi, setSearchResultManifests, props.repoApiInitialized]);

	const [installingPluginsIds, setInstallingPluginIds] = useState<Record<string, boolean>>({});

	const pluginSettings = useMemo(() => {
		return { ...PluginService.instance().unserializePluginSettings(props.pluginSettings) };
	}, [props.pluginSettings]);

	const searchResults: SearchResultRecord[] = useMemo(() => {
		return searchResultManifests.map(manifest => {
			const settings = pluginSettings[manifest.id];

			let installState = InstallState.NotInstalled;
			if (settings && !settings.deleted) {
				installState = InstallState.Installed;
			}
			if (installingPluginsIds[manifest.id]) {
				installState = InstallState.Installing;
			}

			const item: PluginItem = {
				manifest,
				enabled: settings && settings.enabled,
				deleted: settings && !settings.deleted,
				devMode: false,
				builtIn: false,
				hasBeenUpdated: false,
			};

			return {
				id: manifest.id,
				item,
				installState,
			};
		});
	}, [searchResultManifests, installingPluginsIds, pluginSettings]);

	const onPluginSettingsChange = useCallback((event: OnPluginSettingChangeEvent) => {
		props.onUpdatePluginStates(event.value);
	}, [props.onUpdatePluginStates]);

	const installPlugin = useInstallHandler(
		setInstallingPluginIds, pluginSettings, props.repoApi, onPluginSettingsChange, false,
	);

	const renderResult = useCallback(({ item }: { item: SearchResultRecord }) => {
		const manifest = item.item.manifest;

		return (
			<PluginBox
				themeId={props.themeId}
				key={manifest.id}
				item={item.item}
				installState={item.installState}
				isCompatible={PluginService.instance().isCompatible(manifest)}
				onInstall={installPlugin}
				onAboutPress={openWebsiteForPlugin}
			/>
		);
	}, [installPlugin, props.themeId]);

	return (
		<View style={{ flexDirection: 'column' }}>
			<Searchbar
				testID='searchbar'
				placeholder={_('Search')}
				onChangeText={setSearchQuery}
				value={searchQuery}
				editable={props.repoApiInitialized}
			/>
			<FlatList
				data={searchResults}
				renderItem={renderResult}
				keyExtractor={item => item.id}
				scrollEnabled={false}
			/>
		</View>
	);
};

export default PluginSearch;
