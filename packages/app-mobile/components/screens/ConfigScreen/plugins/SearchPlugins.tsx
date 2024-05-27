import * as React from 'react';

import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Searchbar, Menu } from 'react-native-paper';
const Icon = require('react-native-vector-icons/Ionicons').default;
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

const styles = StyleSheet.create({
	iconButton: {
		flex: 1,
		paddingLeft: 10,
		paddingRight: 10,
		paddingTop: 10,
		paddingBottom: 10,
	},
	topIcon: {
		flex: 1,
		textAlignVertical: 'center',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	searchbar: {
		flex: 1,
	},
});

const PluginSearch: React.FC<Props> = props => {
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResultManifests, setSearchResultManifests] = useState<PluginManifest[]>([]);

	const [menuVisible, setMenuVisible] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const categories = ['All', 'appearance', 'developer tools', 'productivity', 'themes', 'integrations', 'viewer', 'search', 'tags', 'editor', 'files', 'personal knowledge management'];
	const openMenu = () => setMenuVisible(true);
	const closeMenu = () => setMenuVisible(false);

	const selectCategory = (category: string) => {
		setSelectedCategory(category === 'All' ? null : category);
		closeMenu();
	};

	useAsyncEffect(async event => {
		if (!searchQuery || !props.repoApiInitialized) {
			setSearchResultManifests([]);
		} else {
			const searchResults = await props.repoApi.search(searchQuery);
			const results = selectedCategory ?
				await props.repoApi.filterSearch(searchResults, selectedCategory) :
				searchResults;
			if (event.cancelled) return;
			setSearchResultManifests(results);
		}
	}, [searchQuery, selectedCategory, props.repoApi, setSearchResultManifests, props.repoApiInitialized]);

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
			<View style={styles.searchContainer}>
				<Searchbar
					testID='searchbar'
					placeholder={_('Search')}
					onChangeText={setSearchQuery}
					value={searchQuery}
					editable={props.repoApiInitialized}
					style={styles.searchbar}
				/>
				<Menu
					visible={menuVisible}
					onDismiss={closeMenu}
					anchor={
						<TouchableOpacity onPress={openMenu} style={styles.iconButton}>
							<Icon testID='filter-button' name="filter-outline" size={30} />
						</TouchableOpacity>
					}
				>
					{categories.map(category => (
						<Menu.Item
							key={category}
							onPress={() => selectCategory(category)}
							title={category}
						/>
					))}
				</Menu>
			</View>
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
