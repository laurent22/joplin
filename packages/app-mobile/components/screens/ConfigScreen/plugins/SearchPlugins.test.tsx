import * as React from 'react';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import SearchPlugins from './SearchPlugins';
import Setting from '@joplin/lib/models/Setting';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';
import pluginServiceSetup from './testUtils/pluginServiceSetup';
import newRepoApi from './testUtils/newRepoApi';

interface WrapperProps {
	repoApi: RepositoryApi;
	repoApiInitialized?: boolean;
	pluginSettings?: PluginSettings;
	onUpdatePluginStates?: (states: PluginSettings)=> void;
}

const noOpFunction = ()=>{};

const SearchWrapper = (props: WrapperProps) => {
	const serializedPluginSettings = useMemo(() => {
		return PluginService.instance().serializePluginSettings(props.pluginSettings ?? {});
	}, [props.pluginSettings]);

	return (
		<SearchPlugins
			themeId={Setting.THEME_LIGHT}
			pluginSettings={serializedPluginSettings}
			repoApiInitialized={props.repoApiInitialized ?? true}
			repoApi={props.repoApi}
			onUpdatePluginStates={props.onUpdatePluginStates ?? noOpFunction}
		/>
	);
};

describe('SearchPlugins', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		pluginServiceSetup();
	});

	it('should find results', async () => {
		const repoApi = await newRepoApi();
		render(<SearchWrapper repoApi={repoApi}/>);

		const searchBox = screen.queryByPlaceholderText('Search');
		expect(searchBox).toBeVisible();

		// No plugin cards should be visible by default
		expect(screen.queryAllByTestId('plugin-card')).toHaveLength(0);

		const user = userEvent.setup();
		await user.type(searchBox, 'backlinks');

		// Should find one result
		await waitFor(() => {
			expect(screen.getByTestId('plugin-card')).not.toBeNull();
		});

		// Clearing the search input should hide all results
		await user.clear(searchBox);
		await waitFor(() => {
			expect(screen.queryByTestId('plugin-card')).toBeNull();
		});
	});
});
