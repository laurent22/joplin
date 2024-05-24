import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import { View, StyleSheet } from 'react-native';
import { Banner, Text, Button, ProgressBar, List, Divider } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PluginToggle from './PluginToggle';
import SearchPlugins from './SearchPlugins';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import useRepoApi from './utils/useRepoApi';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import PluginInfoModal from './PluginInfoModal';
import usePluginCallbacks from './utils/usePluginCallbacks';

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

	useAsyncEffect(async event => {
		while (!event.cancelled) {
			await PluginService.instance().waitForLoadedPluginsChange();
			setLoadedPluginIds(getLoadedPlugins());
		}
	}, []);

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
				<PluginToggle
					key={`plugin-${pluginId}`}
					themeId={props.themeId}
					pluginId={pluginId}
					styles={props.styles}
					pluginSettings={pluginSettings}
					updatablePluginIds={updatablePluginIds}
					updatingPluginIds={updatingPluginIds}
					updatePluginStates={props.updatePluginStates}
					onShowPluginInfo={onShowPluginInfo}
					callbacks={pluginCallbacks}
					repoApi={repoApi}
				/>,
			);
		}
	}

	const showSearch = (
		!props.shouldShowBasedOnSearchQuery || props.shouldShowBasedOnSearchQuery(searchInputSearchText())
	);

	const searchAccordion = (
		<List.Accordion
			title={_('Install new plugins')}
			description={_('Browse and install community plugins.')}
			id="2"
		>
			<SearchPlugins
				pluginSettings={props.pluginSettings}
				themeId={props.themeId}
				onUpdatePluginStates={props.updatePluginStates}
				installingPluginIds={installingPluginIds}
				callbacks={pluginCallbacks}
				repoApiInitialized={repoApiLoaded}
				repoApi={repoApi}
			/>
		</List.Accordion>
	);

	return (
		<View>
			{renderRepoApiStatus()}
			<List.AccordionGroup>
				<List.Accordion
					title={_('Installed plugins')}
					description={_('You currently have %d plugins installed.', installedPluginCards.length)}
					id="1"
				>
					<View style={styles.installedPluginsContainer}>
						{installedPluginCards}
					</View>
				</List.Accordion>
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
				initialItem={shownInDialogItem}
				visible={!!shownInDialogItem}
				onModalDismiss={onPluginDialogClosed}
				pluginCallbacks={pluginCallbacks}
			/>
		</View>
	);
};

export default PluginStates;
