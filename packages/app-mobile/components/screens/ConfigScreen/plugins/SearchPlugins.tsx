import * as React from 'react';

import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import PluginBox, { InstallState } from './PluginBox';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import openWebsiteForPlugin from './utils/openWebsiteForPlugin';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';
import InstalledPluginBox from './InstalledPluginBox';
import SectionLabel from './SectionLabel';

interface Props {
	themeId: number;
	pluginSettings: PluginSettings;
	repoApiInitialized: boolean;
	onUpdatePluginStates: (states: PluginSettings)=> void;
	repoApi: RepositoryApi;

	installingPluginIds: Record<string, boolean>;
	updatingPluginIds: Record<string, boolean>;
	updatablePluginIds: Record<string, boolean>;

	callbacks: PluginCallbacks;
	onShowPluginInfo: PluginCallback;

	searchQuery: string;
	setSearchQuery: (newQuery: string)=> void;
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
		marginBottom: 0,
	},
});


const PluginSearch: React.FC<Props> = props => {
	const { searchQuery, setSearchQuery } = props;
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

		if (item.installState === InstallState.Installed && PluginService.instance().isPluginLoaded(manifest.id)) {
			return (
				<InstalledPluginBox
					pluginId={manifest.id}
					themeId={props.themeId}
					pluginSettings={props.pluginSettings}
					updatablePluginIds={props.updatablePluginIds}
					updatingPluginIds={props.updatingPluginIds}
					showInstalledChip={true}
					callbacks={props.callbacks}
					onShowPluginInfo={props.onShowPluginInfo}
				/>
			);
		} else {
			return (
				<PluginBox
					themeId={props.themeId}
					key={manifest.id}
					item={item.item}
					installState={item.installState}
					showInstalledChip={false}
					isCompatible={PluginService.instance().isCompatible(manifest)}
					onInstall={onInstall}
					onAboutPress={openWebsiteForPlugin}
				/>
			);
		}
	}, [onInstall, props.themeId, props.pluginSettings, props.updatingPluginIds, props.updatablePluginIds, props.onShowPluginInfo, props.callbacks]);

	const onClearSearch = useCallback(() => {
		setSearchQuery('');
	}, [setSearchQuery]);

	const renderSearchButton = () => {
		if (searchQuery) {
			return <TextInput.Icon onPress={onClearSearch} accessibilityLabel={_('Clear search')} icon='close' />;
		} else {
			return <TextInput.Icon icon='magnify' aria-hidden={true} importantForAccessibility='no-hide-descendants'/>;
		}
	};

	// scrollEnabled seems to have a different effect on web, when compared with native:
	// https://github.com/necolas/react-native-web/issues/1042#issuecomment-407157580
	// When not provided on web, scrolling the parent element doesn't work.
	const scrollEnabled = Platform.OS === 'web';

	return (
		<View style={styles.container}>
			<TextInput
				testID='searchbar'
				mode='outlined'
				right={renderSearchButton()}
				placeholder={_('Search for plugins...')}
				onChangeText={setSearchQuery}
				value={searchQuery}
				editable={props.repoApiInitialized}
			/>
			<SectionLabel visible={!!searchQuery.length}>{_('Results (%d):', searchResults.length)}</SectionLabel>
			<FlatList
				data={searchResults}
				renderItem={renderResult}
				keyExtractor={item => item.id}
				scrollEnabled={scrollEnabled}
			/>
		</View>
	);
};

export default PluginSearch;
