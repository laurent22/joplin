import * as React from 'react';
import { mockMobilePlatform, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import pluginServiceSetup from './testUtils/pluginServiceSetup';
import createMockReduxStore from '../../../../utils/testing/createMockReduxStore';
import WrappedPluginStates from './testUtils/WrappedPluginStates';
import { AppState } from '../../../../utils/types';
import { Store } from 'redux';

const expectSearchResultCountToBe = async (count: number) => {
	await waitFor(() => {
		expect(screen.queryAllByTestId('plugin-card')).toHaveLength(count);
	});
};

let reduxStore: Store<AppState>;

describe('PluginStates/search', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		reduxStore = createMockReduxStore();
		pluginServiceSetup(reduxStore);
		mockMobilePlatform('android');
	});

	it('should find results', async () => {
		render(<WrappedPluginStates initialPluginSettings={{}} store={reduxStore}/>);

		const searchBox = screen.queryByPlaceholderText('Search plugins');
		expect(searchBox).toBeVisible();

		// No plugin cards should be visible by default
		expect(screen.queryAllByTestId('plugin-card')).toHaveLength(0);

		const user = userEvent.setup();
		await user.type(searchBox, 'backlinks');

		// Should find one result
		await expectSearchResultCountToBe(1);

		// Clearing the search input should hide all results
		await user.clear(searchBox);
		await expectSearchResultCountToBe(0);

		// Typing a space should show all results
		await user.type(searchBox, ' ');
		await waitFor(() => {
			expect(screen.queryAllByTestId('plugin-card').length).toBeGreaterThan(2);
		});
	});

	it('should only show recommended plugin search results on iOS-like environments', async () => {
		// iOS uses restricted install mode
		mockMobilePlatform('ios');
		render(<WrappedPluginStates initialPluginSettings={{}} store={reduxStore}/>);

		const searchBox = screen.queryByPlaceholderText('Search plugins');
		expect(searchBox).toBeVisible();

		const user = userEvent.setup();
		await user.type(searchBox, 'abc');

		// Should find recommended plugins
		await expectSearchResultCountToBe(1);

		// Should not find non-recommended plugins
		await user.clear(searchBox);
		await user.type(searchBox, 'backlinks');
		await expectSearchResultCountToBe(0);

		await user.clear(searchBox);
		await user.type(searchBox, ' ');
		await expectSearchResultCountToBe(1);
		expect(screen.getByText(/ABC Sheet Music/i)).toBeTruthy();
		expect(screen.queryByText(/backlink/i)).toBeNull();
	});

	it('should mark incompatible plugins as incompatible', async () => {
		render(<WrappedPluginStates initialPluginSettings={{}} store={reduxStore}/>);

		const searchBox = screen.queryByPlaceholderText('Search plugins');
		const user = userEvent.setup();
		await user.type(searchBox, 'abc');

		await expectSearchResultCountToBe(1);
		expect(screen.queryByText('Incompatible')).toBeNull();

		await user.clear(searchBox);
		await user.type(searchBox, 'side bar toggle');
		await expectSearchResultCountToBe(1);
		expect(await screen.findByText(/Note list and side bar/i)).toBeVisible();
		expect(await screen.findByText('Incompatible')).toBeVisible();
	});
});
