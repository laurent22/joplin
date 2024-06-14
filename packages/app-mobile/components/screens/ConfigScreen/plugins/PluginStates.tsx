import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { View, StyleSheet } from 'react-native';
import { Banner, Text, Button, ProgressBar, List, Divider } from 'react-native-paper';
import { _, _n } from '@joplin/lib/locale';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import InstalledPluginBox from './InstalledPluginBox';
import SearchPlugins from './SearchPlugins';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import useRepoApi from './utils/useRepoApi';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import PluginInfoModal from './PluginInfoModal';
import usePluginCallbacks from './utils/usePluginCallbacks';
import BetaChip from '../../../BetaChip';

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
		marginLeft: 8,
		marginRight: 8,
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

	const pluginIds = useLoadedPluginIds();
	for (const pluginId of pluginIds) {
		const plugin = pluginService.plugins[pluginId];

		if (!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(plugin.manifest.name)) {
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

	const [searchQuery, setSearchQuery] = useState('');

	const searchAccordion = (
		<List.Accordion
			title={_('Install new plugins')}
			description={_('Browse and install community plugins.')}
			id='search'
		>
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
		</List.Accordion>
	);

	const isSearching = !!props.shouldShowBasedOnSearchQuery;
	// Don't include the number of installed plugins when searching -- only a few of the total
	// may be shown by the search.
	const installedAccordionDescription = !isSearching ? _n('You currently have %d plugin installed.', 'You currently have %d plugins installed.', pluginIds.length, pluginIds.length) : null;

	// Using a different wrapper prevents the installed item group from being openable when
	// there are no plugins:
	const InstalledItemWrapper = pluginIds.length ? List.Accordion : List.Item;

	return (
		<View>
			{renderRepoApiStatus()}
			<Banner visible={true} elevation={0} icon={() => <BetaChip size={13}/>}>
				<Text>Plugin support on mobile is still in beta. Plugins may cause performance issues. Some have only partial support for Joplin mobile.</Text>
			</Banner>
			<Divider/>

			<List.AccordionGroup>
				<InstalledItemWrapper
					title={_('Installed plugins')}
					description={installedAccordionDescription}
					id='installed'
				>
					<View style={styles.installedPluginsContainer}>
						{installedPluginCards}
					</View>
				</InstalledItemWrapper>
				<Divider/>
				{showSearch ? searchAccordion : null}
				<Divider/>
			</List.AccordionGroup>
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
		</View>
	);
};

export default PluginStates;
