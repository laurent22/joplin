import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import SearchInput, { OnChangeEvent } from '../../../lib/SearchInput/SearchInput';
import styled from 'styled-components';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import PluginBox, { InstallState } from './PluginBox';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { _ } from '@joplin/lib/locale';
import useOnInstallHandler from './useOnInstallHandler';
import { themeStyle } from '@joplin/lib/theme';

const Root = styled.div`
`;

const ResultsRoot = styled.div`
	display: flex;
	flex-wrap: wrap;
`;

interface Props {
	themeId: number;
	searchQuery: string;
	onSearchQueryChange(event: OnChangeEvent): void;
	pluginSettings: PluginSettings;
	onPluginSettingsChange(event: any): void;
	renderDescription: Function;
	maxWidth: number;
	repoApi(): RepositoryApi;
	disabled: boolean;
}

function sortManifestResults(results: PluginManifest[]): PluginManifest[] {
	return results.sort((m1, m2) => {
		if (m1._recommended && !m2._recommended) return -1;
		if (!m1._recommended && m2._recommended) return +1;
		return m1.name.toLowerCase() < m2.name.toLowerCase() ? -1 : +1;
	});
}

export default function(props: Props) {
	const [searchStarted, setSearchStarted] = useState(false);
	const [manifests, setManifests] = useState<PluginManifest[]>([]);
	const asyncSearchQueue = useRef(new AsyncActionQueue(10));
	const [installingPluginsIds, setInstallingPluginIds] = useState<Record<string, boolean>>({});
	const [searchResultCount, setSearchResultCount] = useState(null);

	const onInstall = useOnInstallHandler(setInstallingPluginIds, props.pluginSettings, props.repoApi, props.onPluginSettingsChange, false);

	useEffect(() => {
		setSearchResultCount(null);
		asyncSearchQueue.current.push(async () => {
			if (!props.searchQuery) {
				setManifests([]);
				setSearchResultCount(null);
			} else {
				const r = await props.repoApi().search(props.searchQuery);
				setManifests(sortManifestResults(r));
				setSearchResultCount(r.length);
			}
		});
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.searchQuery]);

	const onChange = useCallback((event: OnChangeEvent) => {
		setSearchStarted(true);
		props.onSearchQueryChange(event);
	}, [props.onSearchQueryChange]);

	const onSearchButtonClick = useCallback(() => {
		setSearchStarted(false);
		props.onSearchQueryChange({ value: '' });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	function installState(pluginId: string): InstallState {
		const settings = props.pluginSettings[pluginId];
		if (settings && !settings.deleted) return InstallState.Installed;
		if (installingPluginsIds[pluginId]) return InstallState.Installing;
		return InstallState.NotInstalled;
	}

	function renderResults(query: string, manifests: PluginManifest[]) {
		if (query && !manifests.length) {
			if (searchResultCount === null) return ''; // Search in progress
			return props.renderDescription(props.themeId, _('No results'));
		} else {
			const output = [];

			for (const manifest of manifests) {
				output.push(<PluginBox
					key={manifest.id}
					manifest={manifest}
					themeId={props.themeId}
					isCompatible={PluginService.instance().isCompatible(manifest.app_min_version)}
					onInstall={onInstall}
					installState={installState(manifest.id)}
				/>);
			}

			return output;
		}
	}

	const renderContentSourceInfo = () => {
		if (props.repoApi().isUsingDefaultContentUrl) return null;
		const theme = themeStyle(props.themeId);
		const url = new URL(props.repoApi().contentBaseUrl);
		return <div style={{ ...theme.textStyleMinor, marginTop: 5, fontSize: theme.fontSize }}>{_('Content provided by %s', url.hostname)}</div>;
	};

	return (
		<Root>
			<div style={{ marginBottom: 10, width: props.maxWidth }}>
				<SearchInput
					inputRef={null}
					value={props.searchQuery}
					onChange={onChange}
					onSearchButtonClick={onSearchButtonClick}
					searchStarted={searchStarted}
					placeholder={props.disabled ? _('Please wait...') : _('Search for plugins...')}
					disabled={props.disabled}
				/>
				{renderContentSourceInfo()}
			</div>

			<ResultsRoot>
				{renderResults(props.searchQuery, manifests)}
			</ResultsRoot>
		</Root>
	);
}
