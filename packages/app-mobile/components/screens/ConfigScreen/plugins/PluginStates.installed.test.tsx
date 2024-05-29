import * as React from 'react';
import { createTempDir, mockMobilePlatform, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import pluginServiceSetup from './testUtils/pluginServiceSetup';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import shim from '@joplin/lib/shim';
import { resetRepoApi } from './utils/useRepoApi';
import { Store } from 'redux';
import { AppState } from '../../../../utils/types';
import createMockReduxStore from '../../../../utils/testing/createMockReduxStore';
import WrappedPluginStates from './testUtils/WrappedPluginStates';
import mockRepositoryApiConstructor from './testUtils/mockRepositoryApiConstructor';
import Setting from '@joplin/lib/models/Setting';


let reduxStore: Store<AppState> = null;

const loadMockPlugin = async (id: string, name: string, version: string, pluginSettings: PluginSettings) => {
	const service = PluginService.instance();
	const pluginSource = `
		/* joplin-manifest:
		${JSON.stringify({
		id,
		manifest_version: 1,
		app_min_version: '1.4',
		name,
		description: 'Test plugin',
		platforms: ['mobile', 'desktop'],
		version,
		homepage_url: 'https://joplinapp.org',
	})}
		*/

		joplin.plugins.register({
			onStart: async function() { },
		});
	`;
	const pluginPath = join(await createTempDir(), 'plugin.js');
	await writeFile(pluginPath, pluginSource, 'utf-8');
	await act(async () => {
		await service.loadAndRunPlugins([pluginPath], pluginSettings);
	});
};

const showInstalledTab = async () => {
	const installedTab = await screen.findByText('Installed plugins');
	await userEvent.press(installedTab);
};

describe('PluginStates.installed', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		reduxStore = createMockReduxStore();
		pluginServiceSetup(reduxStore);
		resetRepoApi();

		await mockMobilePlatform('android');
		await mockRepositoryApiConstructor();
	});
	afterEach(async () => {
		for (const pluginId of PluginService.instance().pluginIds) {
			await act(() => PluginService.instance().unloadPlugin(pluginId));
		}
	});

	it.each([
		'android',
		'ios',
	])('should not allow updating a plugin that is not recommended on iOS, but should on Android (on %s)', async (platform) => {
		await mockMobilePlatform(platform);
		expect(shim.mobilePlatform()).toBe(platform);
		await mockRepositoryApiConstructor();

		const abcPluginId = 'org.joplinapp.plugins.AbcSheetMusic';
		const backlinksPluginId = 'joplin.plugin.ambrt.backlinksToNote';

		const defaultPluginSettings: PluginSettings = {
			[abcPluginId]: defaultPluginSetting(),
			[backlinksPluginId]: defaultPluginSetting(),
		};

		// Load an outdated recommended plugin
		await loadMockPlugin(abcPluginId, 'ABC Sheet Music', '0.0.1', defaultPluginSettings);
		expect(PluginService.instance().plugins[abcPluginId]).toBeTruthy();

		// Load a plugin not marked as recommended
		await loadMockPlugin(backlinksPluginId, 'Backlinks to note', '0.0.1', defaultPluginSettings);
		expect(PluginService.instance().plugins[backlinksPluginId]).toBeTruthy();

		const wrapper = render(
			<WrappedPluginStates
				initialPluginSettings={defaultPluginSettings}
				store={reduxStore}
			/>,
		);
		await showInstalledTab();
		expect(await screen.findByText(/^ABC Sheet Music/)).toBeVisible();
		expect(await screen.findByText(/^Backlinks to note/)).toBeVisible();

		const updateMarkers = await screen.findAllByText('Update available');

		// Backlinks to note should not be updatable on iOS (it's not _recommended).
		// ABC Sheet Music should always be updatable
		if (platform === 'android') {
			expect(updateMarkers).toHaveLength(2);
		} else {
			expect(updateMarkers).toHaveLength(1);
		}

		wrapper.unmount();
	});

	it('should show the current plugin version on updatable plugins', async () => {
		const abcPluginId = 'org.joplinapp.plugins.AbcSheetMusic';
		const defaultPluginSettings: PluginSettings = { [abcPluginId]: defaultPluginSetting() };

		const outdatedVersion = '0.0.1';
		await loadMockPlugin(abcPluginId, 'ABC Sheet Music', outdatedVersion, defaultPluginSettings);
		expect(PluginService.instance().plugins[abcPluginId]).toBeTruthy();

		const wrapper = render(
			<WrappedPluginStates
				initialPluginSettings={defaultPluginSettings}
				store={reduxStore}
			/>,
		);
		await showInstalledTab();

		const abcSheetMusicCard = await screen.findByText(/^ABC Sheet Music/);
		expect(abcSheetMusicCard).toBeVisible();
		expect(await screen.findByText('Update available')).toBeVisible();
		expect(await screen.findByText(`v${outdatedVersion}`)).toBeVisible();

		wrapper.unmount();
	});

	it('should update the list of installed plugins when a plugin is installed and uninstalled', async () => {
		const pluginSettings: PluginSettings = { };

		const wrapper = render(
			<WrappedPluginStates
				initialPluginSettings={pluginSettings}
				store={reduxStore}
			/>,
		);
		await showInstalledTab();

		// Initially, no plugins should be visible.
		expect(screen.queryByText(/^ABC Sheet Music/)).toBeNull();

		const testPluginId1 = 'org.joplinapp.plugins.AbcSheetMusic';
		const testPluginId2 = 'org.joplinapp.plugins.test.plugin.id';
		await act(() => loadMockPlugin(testPluginId1, 'ABC Sheet Music', '1.2.3', pluginSettings));
		await act(() => loadMockPlugin(testPluginId2, 'A test plugin', '1.0.0', pluginSettings));
		expect(PluginService.instance().plugins[testPluginId1]).toBeTruthy();

		// Should update the list of installed plugins even though the plugin settings didn't change.
		expect(await screen.findByText(/^ABC Sheet Music/)).toBeVisible();
		expect(await screen.findByText(/^A test plugin/)).toBeVisible();

		// Uninstalling one plugin should keep the other in the list
		await act(() => PluginService.instance().uninstallPlugin(testPluginId1));
		expect(await screen.findByText(/^A test plugin/)).toBeVisible();
		expect(screen.queryByText(/^ABC Sheet Music/)).toBeNull();

		wrapper.unmount();
	});

	it('should support disabling plugins from the info modal', async () => {
		const abcPluginId = 'org.joplinapp.plugins.AbcSheetMusic';
		const defaultPluginSettings: PluginSettings = { [abcPluginId]: defaultPluginSetting() };

		await loadMockPlugin(abcPluginId, 'ABC Sheet Music', '1.2.3', defaultPluginSettings);
		expect(PluginService.instance().plugins[abcPluginId]).toBeTruthy();

		const wrapper = render(
			<WrappedPluginStates
				initialPluginSettings={defaultPluginSettings}
				store={reduxStore}
			/>,
		);
		await showInstalledTab();

		const card = await screen.findByText('ABC Sheet Music');
		const user = userEvent.setup();

		// Open the plugin dialog
		await user.press(card);

		const enabledSwitch = await screen.findByLabelText('Enabled');
		expect(enabledSwitch).toBeVisible();

		// Use fireEvent instead of userEvent.press -- .press doesn't seem to work
		// for Switches. Similar issue: https://github.com/callstack/react-native-testing-library/issues/518.
		fireEvent(enabledSwitch, 'valueChange', false);

		// The plugin should now be disabled
		await waitFor(() => {
			expect(Setting.value('plugins.states')).toMatchObject({
				[abcPluginId]: { enabled: false },
			});
		});

		wrapper.unmount();
	});
});
