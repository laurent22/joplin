import Setting from '@joplin/lib/models/Setting';
import PluginService, { defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import loadPlugins, { Props as LoadPluginsProps } from './loadPlugins';
import createMockReduxStore from '../utils/testing/createMockReduxStore';
import MockPluginRunner from './testing/MockPluginRunner';

const setPluginEnabled = (id: string, enabled: boolean) => {
	const newPluginStates = {
		...Setting.value('plugins.states'),
		[id]: {
			...defaultPluginSetting(),
			enabled,
		},
	};
	Setting.setValue('plugins.states', newPluginStates);
};

const addPluginWithManifest = async (manifest: PluginManifest, enabled: boolean) => {
	const pluginSource = `
		/* joplin-manifest:
		${JSON.stringify(manifest)}
		*/

		joplin.plugins.register({
			onStart: async function() { },
		});
	`;
	const pluginPath = join(Setting.value('pluginDir'), `${manifest.id}.js`);
	await writeFile(pluginPath, pluginSource, 'utf-8');

	setPluginEnabled(manifest.id, enabled);
};

const defaultManifestProperties = {
	manifest_version: 1,
	version: '0.1.0',
	app_min_version: '2.3.4',
	platforms: ['desktop', 'mobile'],
};

describe('loadPlugins', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		for (const id of PluginService.instance().pluginIds) {
			await PluginService.instance().unloadPlugin(id);
		}
		await PluginService.instance().destroy();
	});

	test('should load only enabled plugins', async () => {
		await addPluginWithManifest({
			...defaultManifestProperties,
			id: 'this.is.a.test.1',
			name: 'Disabled Plugin',
		}, false);

		const enabledPluginId = 'this.is.a.test.2';
		await addPluginWithManifest({
			...defaultManifestProperties,
			id: enabledPluginId,
			name: 'Enabled Plugin',
		}, true);

		const pluginRunner = new MockPluginRunner();
		const store = createMockReduxStore();

		const loadPluginsOptions: LoadPluginsProps = {
			pluginRunner,
			pluginSettings: Setting.value('plugins.states'),
			store,
			reloadAll: false,
			cancelEvent: { cancelled: false },
		};
		expect(Object.keys(PluginService.instance().plugins)).toHaveLength(0);

		await loadPlugins(loadPluginsOptions);
		await pluginRunner.waitForAllToBeRunning([enabledPluginId]);

		expect(pluginRunner.runningPluginIds).toMatchObject([enabledPluginId]);
		// No plugins were running before, so none should be stopped.
		expect(pluginRunner.stopCalledTimes).toBe(0);

		// Loading again should not re-run plugins
		await loadPlugins(loadPluginsOptions);

		// Should have tried to stop at most the disabled plugin (which is a no-op).
		expect(pluginRunner.stopCalledTimes).toBe(1);
		expect(pluginRunner.runningPluginIds).toMatchObject([enabledPluginId]);
	});

	test('should reload all plugins when reloadAll is true', async () => {
		const enabledCount = 3;
		for (let i = 0; i < enabledCount; i++) {
			await addPluginWithManifest({
				...defaultManifestProperties,
				id: `joplin.test.plugin.${i}`,
				name: `Enabled Plugin ${i}`,
			}, true);
		}

		const disabledCount = 6;
		for (let i = 0; i < disabledCount; i++) {
			await addPluginWithManifest({
				...defaultManifestProperties,
				id: `joplin.test.plugin.disabled.${i}`,
				name: `Disabled Plugin ${i}`,
			}, false);
		}

		const pluginRunner = new MockPluginRunner();
		const store = createMockReduxStore();
		const loadPluginsOptions: LoadPluginsProps = {
			pluginRunner,
			pluginSettings: Setting.value('plugins.states'),
			store,
			reloadAll: true,
			cancelEvent: { cancelled: false },
		};
		await loadPlugins(loadPluginsOptions);
		let expectedRunningIds = ['joplin.test.plugin.0', 'joplin.test.plugin.1', 'joplin.test.plugin.2'];
		await pluginRunner.waitForAllToBeRunning(expectedRunningIds);

		// No additional plugins should be running.
		expect([...pluginRunner.runningPluginIds].sort()).toMatchObject(expectedRunningIds);

		// No plugins were running before -- there were no plugins to stop
		expect(pluginRunner.stopCalledTimes).toBe(0);

		// Enabling a plugin and reloading it should cause all plugins to load.
		setPluginEnabled('joplin.test.plugin.disabled.2', true);
		await loadPlugins({ ...loadPluginsOptions, pluginSettings: Setting.value('plugins.states') });
		expectedRunningIds = ['joplin.test.plugin.0', 'joplin.test.plugin.1', 'joplin.test.plugin.2', 'joplin.test.plugin.disabled.2'];
		await pluginRunner.waitForAllToBeRunning(expectedRunningIds);

		// Reloading all should stop all plugins and rerun enabled plugins, even
		// if not enabled previously.
		expect(pluginRunner.stopCalledTimes).toBe(disabledCount + enabledCount);
		expect([...pluginRunner.runningPluginIds].sort()).toMatchObject(expectedRunningIds);
	});
});
