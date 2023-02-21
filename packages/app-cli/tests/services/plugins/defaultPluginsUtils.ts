import { installDefaultPlugins, getDefaultPluginsInstallState, setSettingsForDefaultPlugins, checkPreInstalledDefaultPlugins } from '@joplin/lib/services/plugins/defaultPlugins/defaultPluginsUtils';
import PluginRunner from '../../../app/services/plugins/PluginRunner';
import { pathExists } from 'fs-extra';
import { checkThrow, setupDatabaseAndSynchronizer, supportDir, switchClient } from '@joplin/lib/testing/test-utils';
import PluginService, { defaultPluginSetting, DefaultPluginsInfo, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';

const testPluginDir = `${supportDir}/plugins`;

function newPluginService(appVersion: string = '1.4') {
	const runner = new PluginRunner();
	const service = new PluginService();
	service.initialize(
		appVersion,
		{
			joplin: {},
		},
		runner,
		{
			dispatch: () => {},
			getState: () => {},
		}
	);
	return service;
}

describe('defaultPluginsUtils', () => {

	const pluginsId = ['joplin.plugin.ambrt.backlinksToNote', 'org.joplinapp.plugins.ToggleSidebars'];

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should install default plugins with no previous default plugins installed', (async () => {
		const testPluginDir = `${supportDir}/pluginRepo/plugins`;
		Setting.setValue('installedDefaultPlugins', []);

		const service = newPluginService('2.1');

		const pluginSettings = service.unserializePluginSettings(Setting.value('plugins.states'));

		const newPluginsSettings = await installDefaultPlugins(service, testPluginDir, pluginsId, pluginSettings);

		const installedPluginPath1 = `${Setting.value('pluginDir')}/${pluginsId[0]}.jpl`;
		const installedPluginPath2 = `${Setting.value('pluginDir')}/${pluginsId[1]}.jpl`;

		expect(await pathExists(installedPluginPath1)).toBe(true);
		expect(await pathExists(installedPluginPath2)).toBe(true);

		expect(newPluginsSettings[pluginsId[0]]).toMatchObject(defaultPluginSetting());
		expect(newPluginsSettings[pluginsId[1]]).toMatchObject(defaultPluginSetting());

	}));

	it('should install default plugins with previous default plugins installed', (async () => {

		const testPluginDir = `${supportDir}/pluginRepo/plugins`;
		Setting.setValue('installedDefaultPlugins', ['org.joplinapp.plugins.ToggleSidebars']);

		const service = newPluginService('2.1');

		const pluginSettings = service.unserializePluginSettings(Setting.value('plugins.states'));

		const newPluginsSettings = await installDefaultPlugins(service, testPluginDir, pluginsId, pluginSettings);

		const installedPluginPath1 = `${Setting.value('pluginDir')}/${pluginsId[0]}.jpl`;
		const installedPluginPath2 = `${Setting.value('pluginDir')}/${pluginsId[1]}.jpl`;

		expect(await pathExists(installedPluginPath1)).toBe(true);
		expect(await pathExists(installedPluginPath2)).toBe(false);

		expect(newPluginsSettings[pluginsId[0]]).toMatchObject(defaultPluginSetting());
		expect(newPluginsSettings[pluginsId[1]]).toBeUndefined();
	}));

	it('should get default plugins install state', (async () => {
		const testCases = [
			{
				'installedDefaultPlugins': [''],
				'loadingPlugins': [`${testPluginDir}/simple`, `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`],
				'plugin1DefaultState': defaultPluginSetting(),
				'plugin2DefaultState': defaultPluginSetting(),
				'installedDefaultPlugins1': true,
				'installedDefaultPlugins2': true,
			},
			{
				'installedDefaultPlugins': [''],
				'loadingPlugins': [`${testPluginDir}/simple`],
				'plugin1DefaultState': defaultPluginSetting(),
				'plugin2DefaultState': undefined,
				'installedDefaultPlugins1': true,
				'installedDefaultPlugins2': false,
			},
			{
				'installedDefaultPlugins': ['org.joplinapp.plugins.Simple'],
				'loadingPlugins': [`${testPluginDir}/simple`, `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`],
				'plugin1DefaultState': undefined,
				'plugin2DefaultState': defaultPluginSetting(),
				'installedDefaultPlugins1': true,
				'installedDefaultPlugins2': true,
			},
			{
				'installedDefaultPlugins': ['org.joplinapp.plugins.Simple'],
				'loadingPlugins': [`${testPluginDir}/simple`],
				'plugin1DefaultState': undefined,
				'plugin2DefaultState': undefined,
				'installedDefaultPlugins1': true,
				'installedDefaultPlugins2': false,
			},
		];

		for (const testCase of testCases) {
			const service = newPluginService();
			const pluginsId = ['org.joplinapp.plugins.Simple', 'org.joplinapp.FirstJplPlugin'];

			Setting.setValue('installedDefaultPlugins', testCase.installedDefaultPlugins);
			await service.loadAndRunPlugins(testCase.loadingPlugins, {});

			// setting installedDefaultPlugins state
			const defaultInstallStates: PluginSettings = getDefaultPluginsInstallState(service, pluginsId);

			expect(defaultInstallStates[pluginsId[0]]).toStrictEqual(testCase.plugin1DefaultState);
			expect(defaultInstallStates[pluginsId[1]]).toStrictEqual(testCase.plugin2DefaultState);


			const installedDefaultPlugins = Setting.value('installedDefaultPlugins');
			expect(installedDefaultPlugins.includes(pluginsId[0])).toBe(testCase.installedDefaultPlugins1);
			expect(installedDefaultPlugins.includes(pluginsId[1])).toBe(testCase.installedDefaultPlugins2);

		}

	}));

	it('should check pre-installed default plugins', (async () => {
		// with previous pre-installed default plugins
		Setting.setValue('installedDefaultPlugins', ['']);
		let pluginSettings, installedDefaultPlugins;

		pluginSettings = { [pluginsId[0]]: defaultPluginSetting() };
		checkPreInstalledDefaultPlugins(pluginsId, pluginSettings);

		installedDefaultPlugins = Setting.value('installedDefaultPlugins');
		expect(installedDefaultPlugins.includes(pluginsId[0])).toBe(true);
		expect(installedDefaultPlugins.includes(pluginsId[1])).toBe(false);


		// with no previous pre-installed default plugins
		Setting.setValue('installedDefaultPlugins', ['not-a-default-plugin']);
		pluginSettings = {};
		checkPreInstalledDefaultPlugins(pluginsId, pluginSettings);

		installedDefaultPlugins = Setting.value('installedDefaultPlugins');
		expect(installedDefaultPlugins.includes(pluginsId[0])).toBe(false);
		expect(installedDefaultPlugins.includes(pluginsId[1])).toBe(false);

	}));

	it('should set initial settings for default plugins', async () => {
		const service = newPluginService();

		const pluginScript = `
		/* joplin-manifest:
		{
			"id": "io.github.jackgruber.backup",
			"manifest_version": 1,
			"app_min_version": "1.4",
			"name": "JS Bundle test",
			"version": "1.0.0"
		}
		*/
		joplin.plugins.register({
			onStart: async function() {
				await joplin.settings.registerSettings({
					path: {
						value: "initial-path",
						type: 2,
						section: "backupSection",
						public: true,
						label: "Backup path",
					  },
				})
			},
		});`;

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const defaultPluginsInfo: DefaultPluginsInfo = {
			'io.github.jackgruber.backup': {
				version: '1.0.2',
				settings: {
					'path': `${Setting.value('profileDir')}`,
				},
			},
			'plugin.calebjohn.rich-markdown': {
				version: '0.8.3',
			},
		};

		// with pre-installed default plugin
		Setting.setValue('installedDefaultPlugins', ['io.github.jackgruber.backup']);
		setSettingsForDefaultPlugins(defaultPluginsInfo);
		expect(Setting.value('plugin-io.github.jackgruber.backup.path')).toBe('initial-path');
		await service.destroy();

		// with no pre-installed default plugin
		Setting.setValue('installedDefaultPlugins', ['']);
		setSettingsForDefaultPlugins(defaultPluginsInfo);
		expect(Setting.value('plugin-io.github.jackgruber.backup.path')).toBe(`${Setting.value('profileDir')}`);
		await service.destroy();
	});

	it('should not throw error on missing setting key', async () => {

		const service = newPluginService();

		const pluginScript = `
		/* joplin-manifest:
		{
			"id": "io.github.jackgruber.backup",
			"manifest_version": 1,
			"app_min_version": "1.4",
			"name": "JS Bundle test",
			"version": "1.0.0"
		}
		*/
		joplin.plugins.register({
			onStart: async function() {
				await joplin.settings.registerSettings({
					path: {
						value: "initial-path",
						type: 2,
						section: "backupSection",
						public: true,
						label: "Backup path",
					  },
				})
			},
		});`;

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const defaultPluginsInfo: DefaultPluginsInfo = {
			'io.github.jackgruber.backup': {
				version: '1.0.2',
				settings: {
					'path': `${Setting.value('profileDir')}`,
					'missing-key1': 'someValue',
				},
			},
			'plugin.calebjohn.rich-markdown': {
				version: '0.8.3',
				settings: {
					'missing-key2': 'someValue',
				},
			},
		};

		Setting.setValue('installedDefaultPlugins', ['']);
		expect(checkThrow(() => setSettingsForDefaultPlugins(defaultPluginsInfo))).toBe(false);
		expect(Setting.value('plugin-io.github.jackgruber.backup.path')).toBe(`${Setting.value('profileDir')}`);
		await service.destroy();
	});

});
