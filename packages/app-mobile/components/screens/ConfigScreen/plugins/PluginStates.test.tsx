import * as React from 'react';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import { afterAllCleanUp, afterEachCleanUp, createTempDir, mockMobilePlatform, setupDatabaseAndSynchronizer, supportDir, switchClient } from '@joplin/lib/testing/test-utils';

import { render, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';

import Setting from '@joplin/lib/models/Setting';
import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { useCallback, useState } from 'react';
import pluginServiceSetup from './testUtils/pluginServiceSetup';
import PluginStates from './PluginStates';
import configScreenStyles from '../configScreenStyles';
import { remove, writeFile } from 'fs-extra';
import { join } from 'path';
import shim from '@joplin/lib/shim';
import { resetRepoApi } from './utils/useRepoApi';

interface WrapperProps {
	initialPluginSettings: PluginSettings;
}

const shouldShowBasedOnSettingSearchQuery = ()=>true;
const PluginStatesWrapper = (props: WrapperProps) => {
	const styles = configScreenStyles(Setting.THEME_LIGHT);

	const [pluginStates, setPluginStates] = useState(() => {
		return PluginService.instance().serializePluginSettings(props.initialPluginSettings ?? {});
	});

	const updatePluginStates = useCallback((newStates: PluginSettings) => {
		const serialized = PluginService.instance().serializePluginSettings(newStates);
		setPluginStates(serialized);
	}, []);

	return (
		<PluginStates
			themeId={Setting.THEME_LIGHT}
			styles={styles}
			updatePluginStates={updatePluginStates}
			pluginSettings={pluginStates}
			shouldShowBasedOnSearchQuery={shouldShowBasedOnSettingSearchQuery}
		/>
	);
};

let repoTempDir: string|null = null;
const mockRepositoryApiConstructor = async () => {
	if (repoTempDir) {
		await remove(repoTempDir);
	}
	repoTempDir = await createTempDir();

	RepositoryApi.ofDefaultJoplinRepo = jest.fn((_tempDirPath: string, appType, installMode) => {
		return new RepositoryApi(`${supportDir}/pluginRepo`, repoTempDir, appType, installMode);
	});
};

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
	await service.loadAndRunPlugins([pluginPath], pluginSettings);
};

describe('PluginStates', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		pluginServiceSetup();
		resetRepoApi();
	});
	afterEach(async () => {
		for (const pluginId of PluginService.instance().pluginIds) {
			await PluginService.instance().unloadPlugin(pluginId);
		}
		await afterEachCleanUp();
	});
	afterAll(() => afterAllCleanUp());

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

		render(
			<PluginStatesWrapper
				initialPluginSettings={defaultPluginSettings}
			/>,
		);
		expect(await screen.findByText('ABC Sheet Music')).toBeVisible();
		expect(await screen.findByText('Backlinks to note')).toBeVisible();

		expect(await screen.findByRole('button', { name: 'Update ABC Sheet Music', disabled: false })).toBeVisible();

		// Backlinks to note should not be updatable on iOS (it's not _recommended).
		const backlinksToNoteQuery = { name: 'Update Backlinks to note', disabled: false };
		if (platform === 'android') {
			expect(await screen.findByRole('button', backlinksToNoteQuery)).toBeVisible();
		} else {
			expect(await screen.queryByRole('button', backlinksToNoteQuery)).toBeNull();
		}
	});
});
