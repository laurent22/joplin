import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { View, StyleSheet } from 'react-native';
import { Banner, Text, Button, ProgressBar, Divider } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import InstalledPluginBox from './InstalledPluginBox';
import SearchPlugins from './SearchPlugins';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import useRepoApi from './utils/useRepoApi';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import PluginInfoModal from './PluginInfoModal';
import usePluginCallbacks from './utils/usePluginCallbacks';
import BetaChip from '../../../BetaChip';
import SectionLabel from './SectionLabel';

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

// Loaded plugins: All plugins with available manifests.
const useLoadedPluginIds = () => {
	const getLoadedPlugins = useCallback(() => {
		return PluginService.instance().pluginIds;
	}, []);
	const [loadedPluginIds, setLoadedPluginIds] = useState(getLoadedPlugins);

	useEffect(() => {
		const { remove } = PluginService.instance().addLoadedPluginsChangeListener(() => {
			setLoadedPluginIds(getLoadedPlugins());
		});

		return () => {
			remove();
		};
	}, [getLoadedPlugins]);

	return loadedPluginIds;
};

const styles = StyleSheet.create({
	installedPluginsContainer: {
		marginLeft: 12,
		marginRight: 12,
		marginBottom: 10,
	},
});

const PluginStates: React.FC<Props> = props => {
	const [repoApiError, setRepoApiError] = useState(null);
	const [repoApiLoaded, setRepoApiLoaded] = useState(false);
	const [reloadRepoCounter, setRepoReloadCounter] = useState(0);
	const [updatablePluginIds, setUpdatablePluginIds] = useState<Record<string, boolean>>({});
	const [shownInDialogItem, setShownInDialogItem] = useState<PluginItem|null>(null);

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
			return <ProgressBar accessibilityLabel={_('Loading...')} indeterminate={true} />;
		}
	};

	const onShowPluginInfo = useCallback((event: ItemEvent) => {
		setShownInDialogItem(event.item);
	}, []);

	const onPluginDialogClosed = useCallback(() => {
		setShownInDialogItem(null);
	}, []);

	const pluginSettings = useMemo(() => {
		return PluginService.instance().unserializePluginSettings(props.pluginSettings);
	}, [props.pluginSettings]);

	const { callbacks: pluginCallbacks, updatingPluginIds, installingPluginIds } = usePluginCallbacks({
		pluginSettings, updatePluginStates: props.updatePluginStates, repoApi,
	});

	const installedPluginCards = [];
	const pluginService = PluginService.instance();

	const [searchQuery, setSearchQuery] = useState('');
	const isPluginSearching = !!searchQuery;

	const pluginIds = useLoadedPluginIds();
	for (const pluginId of pluginIds) {
		const plugin = pluginService.plugins[pluginId];

		const matchesGlobalSearch = !props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(plugin.manifest.name);
		const showCard = !isPluginSearching && matchesGlobalSearch;
		if (showCard) {
			installedPluginCards.push(
				<InstalledPluginBox
					key={`plugin-${pluginId}`}
					themeId={props.themeId}
					pluginId={pluginId}
					pluginSettings={pluginSettings}
					updatablePluginIds={updatablePluginIds}
					updatingPluginIds={updatingPluginIds}
					showInstalledChip={false}
					onShowPluginInfo={onShowPluginInfo}
					callbacks={pluginCallbacks}
				/>,
			);
		}
	}

	const showSearch = (
		!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(searchInputSearchText())
	);

	const searchSection = (
		<SearchPlugins
			pluginSettings={pluginSettings}
			themeId={props.themeId}
			onUpdatePluginStates={props.updatePluginStates}
			installingPluginIds={installingPluginIds}
			callbacks={pluginCallbacks}
			repoApiInitialized={repoApiLoaded}
			repoApi={repoApi}
			updatingPluginIds={updatingPluginIds}
			updatablePluginIds={updatablePluginIds}
			onShowPluginInfo={onShowPluginInfo}

			searchQuery={searchQuery}
			setSearchQuery={setSearchQuery}
		/>
	);

	const isSearching = !!props.shouldShowBasedOnSearchQuery || isPluginSearching;

	return (
		<View>
			{renderRepoApiStatus()}
			<Banner visible={true} elevation={0} icon={() => <BetaChip size={13}/>}>
				<Text>Plugin support on mobile is still in beta. Plugins may cause performance issues. Some have only partial support for Joplin mobile.</Text>
			</Banner>
			<Divider/>

			{showSearch ? searchSection : null}
			<View style={styles.installedPluginsContainer}>
				<SectionLabel visible={!isSearching}>
					{pluginIds.length ? _('Installed (%d):', pluginIds.length) : _('No plugins are installed.')}
				</SectionLabel>
				{installedPluginCards}
			</View>

			<PluginInfoModal
				themeId={props.themeId}
				pluginSettings={pluginSettings}
				updatablePluginIds={updatablePluginIds}
				updatingPluginIds={updatingPluginIds}
				installingPluginIds={installingPluginIds}
				item={shownInDialogItem}
				visible={!!shownInDialogItem}
				onModalDismiss={onPluginDialogClosed}
				pluginCallbacks={pluginCallbacks}
			/>
			<Divider/>
		</View>
	);
};

export default PluginStates;
