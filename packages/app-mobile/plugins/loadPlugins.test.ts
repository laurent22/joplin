import Setting from '@joplin/lib/models/Setting';
import PluginService, { defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import loadPlugins, { Props as LoadPluginsProps } from './loadPlugins';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import createMockReduxStore from '../utils/testing/createMockReduxStore';

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
	const pluginPath = join(Setting.value('pluginDir'), 'plugin.js');
	await writeFile(pluginPath, pluginSource, 'utf-8');

	setPluginEnabled(manifest.id, enabled);
};

class MockPluginRunner extends BasePluginRunner {
	public runningPluginIds: string[] = [];
	public override run = jest.fn(async (plugin: Plugin) => {
		this.runningPluginIds.push(plugin.manifest.id);
	});
	public override stop = jest.fn(async (plugin: Plugin) => {
		this.runningPluginIds = this.runningPluginIds.filter(id => id !== plugin.manifest.id);
	});
	public override async waitForSandboxCalls() {}
}

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

		for (const id of PluginService.instance().pluginIds) {
			await PluginService.instance().unloadPlugin(id);
		}
	});

	test('should load only enabled plugins', async () => {
		await addPluginWithManifest({
			...defaultManifestProperties,
			id: 'this.is.a.test.1',
			name: 'Disabled Plugin',
		}, false);
		await addPluginWithManifest({
			...defaultManifestProperties,
			id: 'this.is.a.test.2',
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

		await loadPlugins(loadPluginsOptions);

		expect(pluginRunner.runningPluginIds).toMatchObject(['this.is.a.test.2']);
		// No plugins were running before, so none should be stopped.
		expect(pluginRunner.stop).toHaveBeenCalledTimes(0);
		expect(pluginRunner.run).toHaveBeenCalledTimes(1);

		// Loading again should not re-run plugins
		await loadPlugins(loadPluginsOptions);
		expect(pluginRunner.run).toHaveBeenCalledTimes(1);
	});

	test('should reload all plugins when reloadAll is true', async () => {
		const enabledCount = 3;
		for (let i = 0; i < enabledCount; i++) {
			await addPluginWithManifest({
				...defaultManifestProperties,
				id: `test.plugin.${i}`,
				name: `Enabled Plugin ${i}`,
			}, true);
		}

		const disabledCount = 6;
		for (let i = 0; i < disabledCount; i++) {
			await addPluginWithManifest({
				...defaultManifestProperties,
				id: `test.plugin.disabled.${i}`,
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

		expect(pluginRunner.runningPluginIds.sort()).toMatchObject(['test.plugin.0', 'test.plugin.1', 'test.plugin.2']);
		// No plugins were running before -- there were no plugins to stop
		expect(pluginRunner.stop).toHaveBeenCalledTimes(0);
		expect(pluginRunner.run).toHaveBeenCalledTimes(3);

		// Reloading all should stop all plugins and rerun enabled plugins, even
		// if not enabled previously.
		setPluginEnabled('test.plugin.disabled.2', true);
		await loadPlugins(loadPluginsOptions);

		expect(pluginRunner.stop).toHaveBeenCalledTimes(3);
		expect(pluginRunner.run).toHaveBeenCalledTimes(4);
		expect(pluginRunner.runningPluginIds.includes('test.plugin.disabled.2')).toBe(true);
	});
});
