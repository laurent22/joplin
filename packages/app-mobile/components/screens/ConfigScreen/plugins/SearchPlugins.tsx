import * as React from 'react';

import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import PluginBox, { InstallState } from './PluginBox';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import { PluginCallbacks } from './utils/usePluginCallbacks';

interface Props {
	themeId: number;
	pluginSettings: SerializedPluginSettings;
	repoApiInitialized: boolean;
	onUpdatePluginStates: (states: PluginSettings)=> void;
	repoApi: RepositoryApi;

	installingPluginIds: Record<string, boolean>;
	callbacks: PluginCallbacks;
}

interface SearchResultRecord {
	id: string;
	item: PluginItem;
	installState: InstallState;
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'column',
		margin: 12,
	},
	resultsCounter: {
		margin: 12,
		marginTop: 17,
		marginBottom: 4,
	},
});

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
			if (props.installingPluginIds[manifest.id]) {
				installState = InstallState.Installing;
			}

			const item: PluginItem = {
				manifest,
				installed: !!settings,
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
	}, [searchResultManifests, props.installingPluginIds, pluginSettings]);


	const onInstall = props.callbacks.onInstall;
	const renderResult = useCallback(({ item }: { item: SearchResultRecord }) => {
		const manifest = item.item.manifest;

		return (
			<PluginBox
				themeId={props.themeId}
				key={manifest.id}
				item={item.item}
				installState={item.installState}
				isCompatible={PluginService.instance().isCompatible(manifest)}
				onInstall={onInstall}
				onAboutPress={openWebsiteForPlugin}
			/>
		);
	}, [onInstall, props.themeId]);

	const renderResultsCount = () => {
		if (!searchQuery.length) return null;

		return <Text style={styles.resultsCounter} variant='labelLarge'>
			{_('Results (%d):', searchResults.length)}
		</Text>;
	};

	return (
		<View style={styles.container}>
			<TextInput
				testID='searchbar'
				mode='outlined'
				left={<TextInput.Icon icon='magnify' />}
				label={_('Search plugins')}
				onChangeText={setSearchQuery}
				value={searchQuery}
				editable={props.repoApiInitialized}
			/>
			{renderResultsCount()}
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
