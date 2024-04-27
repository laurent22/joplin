import PluginRunner from '../../../app/services/plugins/PluginRunner';
import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import MdToHtml from '@joplin/renderer/MdToHtml';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import * as fs from 'fs-extra';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { expectNotThrow, setupDatabaseAndSynchronizer, switchClient, expectThrow, createTempDir, supportDir, mockMobilePlatform } from '@joplin/lib/testing/test-utils';
import { newPluginScript } from '../../testUtils';
import { join } from 'path';

const testPluginDir = `${supportDir}/plugins`;

function newPluginService(appVersion = '1.4') {
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
		},
	);
	return service;
}

describe('services_PluginService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should load and run a simple plugin', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/simple`], {});

		expect(() => service.pluginById('org.joplinapp.plugins.Simple')).not.toThrowError();

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('my plugin folder');

		const allNotes = await Note.all();
		expect(allNotes.length).toBe(1);
		expect(allNotes[0].title).toBe('testing plugin!');
		expect(allNotes[0].parent_id).toBe(allFolders[0].id);
	}));

	it('should load and run a simple plugin and handle trailing slash', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/simple/`], {});
		expect(() => service.pluginById('org.joplinapp.plugins.Simple')).not.toThrowError();
	}));

	it('should load and run a plugin that uses external packages', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/withExternalModules`], {});
		expect(() => service.pluginById('org.joplinapp.plugins.ExternalModuleDemo')).not.toThrowError();

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);

		// If you have an error here, it might mean you need to run `npm i` from
		// the "withExternalModules" folder. Not clear exactly why.
		expect(allFolders[0].title).toBe('  foo');
	}));

	it('should load multiple plugins from a directory', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/multi_plugins`, {});

		const plugin1 = service.pluginById('org.joplinapp.plugins.MultiPluginDemo1');
		const plugin2 = service.pluginById('org.joplinapp.plugins.MultiPluginDemo2');
		expect(!!plugin1).toBe(true);
		expect(!!plugin2).toBe(true);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(2);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		expect(allFolders.map((f: any) => f.title).sort().join(', ')).toBe('multi - simple1, multi - simple2');
	}));

	it('should load plugins from JS bundles', (async () => {
		const service = newPluginService();

		const plugin = await service.loadPluginFromJsBundle('/tmp', `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugins.JsBundleTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://joplinapp.org"
			}
			*/

			joplin.plugins.register({
				onStart: async function() {
					await joplin.data.post(['folders'], null, { title: "my plugin folder" });
				},
			});
		`);

		await service.runPlugin(plugin);

		expect(plugin.manifest.manifest_version).toBe(1);
		expect(plugin.manifest.name).toBe('JS Bundle test');

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
	}));

	it('should load plugins from JS bundle files', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/jsbundles`, {});
		expect(!!service.pluginById('org.joplinapp.plugins.JsBundleDemo')).toBe(true);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should load plugins from JPL archive', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`], {});
		expect(!!service.pluginById('org.joplinapp.FirstJplPlugin')).toBe(true);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should validate JS bundles', (async () => {
		const invalidJsBundles = [
			`
				/* joplin-manifest:
				{
					"not_a_valid_manifest_at_all": 1
				}
				*/

				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				/* joplin-manifest:
				*/

				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, '',
		];

		const service = newPluginService();

		for (const jsBundle of invalidJsBundles) {
			await expectThrow(async () => await service.loadPluginFromJsBundle('/tmp', jsBundle));
		}
	}));

	it('should register a Markdown-it plugin', (async () => {
		const tempDir = await createTempDir();

		const contentScriptPath = `${tempDir}/markdownItTestPlugin.js`;
		const contentScriptCssPath = `${tempDir}/markdownItTestPlugin.css`;
		await shim.fsDriver().copy(`${testPluginDir}/markdownItTestPlugin.js`, contentScriptPath);
		await shim.fsDriver().copy(`${testPluginDir}/content_script/src/markdownItTestPlugin.css`, contentScriptCssPath);

		const service = newPluginService();

		const plugin = await service.loadPluginFromJsBundle(tempDir, `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugin.MarkdownItPluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://joplinapp.org"
			}
			*/

			joplin.plugins.register({
				onStart: async function() {
					await joplin.contentScripts.register('markdownItPlugin', 'justtesting', './markdownItTestPlugin.js');
				},
			});
		`);

		await service.runPlugin(plugin);

		const contentScripts = plugin.contentScriptsByType(ContentScriptType.MarkdownItPlugin);
		expect(contentScripts.length).toBe(1);
		expect(!!contentScripts[0].path).toBe(true);

		const contentScript = contentScripts[0];

		const mdToHtml = new MdToHtml();
		const module = require(contentScript.path).default;
		mdToHtml.loadExtraRendererRule(contentScript.id, tempDir, module({}), '');

		const result = await mdToHtml.render([
			'```justtesting',
			'something',
			'```',
		].join('\n'));

		const asset = result.pluginAssets.find(a => a.name === 'justtesting/markdownItTestPlugin.css');
		const assetContent: string = await shim.fsDriver().readFile(asset.path, 'utf8');

		expect(assetContent.includes('.just-testing')).toBe(true);
		expect(assetContent.includes('background-color: rgb(202, 255, 255)')).toBe(true);
		expect(result.html.includes('JUST TESTING: something')).toBe(true);

		await shim.fsDriver().remove(tempDir);
	}));

	it('should enable and disable plugins depending on what app version they support', (async () => {
		const pluginScript = `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugins.PluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"version": "1.0.0"
			}
			*/

			joplin.plugins.register({
				onStart: async function() { },
			});
		`;

		const testCases = [
			['1.4', true],
			['1.5', true],
			['2.0', true],
			['1.3', false],
			['0.9', false],
		];

		for (const testCase of testCases) {
			const [appVersion, hasNoError] = testCase;
			const service = newPluginService(appVersion as string);
			const plugin = await service.loadPluginFromJsBundle('', pluginScript);

			if (hasNoError) {
				await expectNotThrow(() => service.runPlugin(plugin));
			} else {
				await expectThrow(() => service.runPlugin(plugin));
			}
		}
	}));

	it.each([
		{
			manifestPlatforms: ['desktop'],
			isDesktop: true,
			appVersion: '3.0.0',
			shouldRun: true,
		},
		{
			manifestPlatforms: ['desktop'],
			isDesktop: false,
			appVersion: '3.0.6',
			shouldRun: false,
		},
		{
			manifestPlatforms: ['desktop', 'mobile'],
			isDesktop: false,
			appVersion: '3.0.6',
			shouldRun: true,
		},
		{
			// Should default to desktop-only
			manifestPlatforms: [],
			isDesktop: false,
			appVersion: '3.0.8',
			shouldRun: false,
		},
	])('should enable and disable plugins depending on what platform(s) they support (case %#: %j)', async ({ manifestPlatforms, isDesktop, appVersion, shouldRun }) => {
		const pluginScript = `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugins.PluginTest",
				"manifest_version": 1,
				"app_min_version": "1.0.0",
				"platforms": ${JSON.stringify(manifestPlatforms)},
				"name": "JS Bundle test",
				"version": "1.0.0"
			}
			*/

			joplin.plugins.register({
				onStart: async function() { },
			});
		`;

		let resetPlatformMock = () => {};
		if (!isDesktop) {
			resetPlatformMock = mockMobilePlatform('android').reset;
		}

		try {
			const service = newPluginService(appVersion);
			const plugin = await service.loadPluginFromJsBundle('', pluginScript);

			if (shouldRun) {
				await expect(service.runPlugin(plugin)).resolves.toBeUndefined();
			} else {
				await expect(service.runPlugin(plugin)).rejects.toThrow(/disabled/);
			}
		} finally {
			resetPlatformMock();
		}
	});

	it('should install a plugin', (async () => {
		const service = newPluginService();
		const pluginPath = `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`;
		await service.installPlugin(pluginPath);
		const installedPluginPath = `${Setting.value('pluginDir')}/org.joplinapp.FirstJplPlugin.jpl`;
		expect(await fs.pathExists(installedPluginPath)).toBe(true);
	}));

	it('should rename the plugin archive to the right name', (async () => {
		const tempDir = await createTempDir();
		const service = newPluginService();
		const pluginPath = `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`;
		const tempPath = `${tempDir}/something.jpl`;
		await shim.fsDriver().copy(pluginPath, tempPath);
		const installedPluginPath = `${Setting.value('pluginDir')}/org.joplinapp.FirstJplPlugin.jpl`;
		await service.installPlugin(tempPath);
		expect(await fs.pathExists(installedPluginPath)).toBe(true);
	}));

	it('should create the data directory', (async () => {
		const pluginScript = newPluginScript(`
			joplin.plugins.register({
				onStart: async function() {
					const dataDir = await joplin.plugins.dataDir();
					joplin.data.post(['folders'], null, { title: JSON.stringify(dataDir) });
				},
			});
		`);

		const expectedPath = `${Setting.value('pluginDataDir')}/org.joplinapp.plugins.PluginTest`;
		expect(await fs.pathExists(expectedPath)).toBe(false);

		const service = newPluginService();
		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		expect(await fs.pathExists(expectedPath)).toBe(true);

		const folders = await Folder.all();
		expect(JSON.parse(folders[0].title)).toBe(expectedPath);
	}));

	it('should uninstall multiple plugins', async () => {
		const service = newPluginService();
		const pluginId1 = 'org.joplinapp.FirstJplPlugin';
		const pluginId2 = 'org.joplinapp.plugins.TocDemo';
		const pluginPath1 = `${testPluginDir}/jpl_test/${pluginId1}.jpl`;
		const pluginPath2 = `${testPluginDir}/toc/${pluginId2}.jpl`;

		await service.installPlugin(pluginPath1);
		await service.installPlugin(pluginPath2);

		// Both should be installed
		expect(await fs.pathExists(`${Setting.value('pluginDir')}/${pluginId1}.jpl`)).toBe(true);
		expect(await fs.pathExists(`${Setting.value('pluginDir')}/${pluginId2}.jpl`)).toBe(true);

		const pluginSettings: PluginSettings = {
			[pluginId1]: { enabled: true, deleted: true, hasBeenUpdated: false },
			[pluginId2]: { enabled: true, deleted: true, hasBeenUpdated: false },
		};

		const newPluginSettings = await service.uninstallPlugins(pluginSettings);

		// Should have deleted plugins
		expect(await fs.pathExists(`${Setting.value('pluginDir')}/${pluginId1}.jpl`)).toBe(false);
		expect(await fs.pathExists(`${Setting.value('pluginDir')}${pluginId2}.jpl`)).toBe(false);

		// Should clear deleted plugins from settings
		expect(newPluginSettings[pluginId1]).toBe(undefined);
		expect(newPluginSettings[pluginId2]).toBe(undefined);
	});

	it('re-running loadAndRunPlugins should reload plugins that have changed but keep unchanged plugins running', async () => {
		const testDir = await createTempDir();
		try {
			const loadCounterNote = await Note.save({ title: 'Log of plugin loads' });
			const readLoadCounterNote = async () => {
				return (await Note.load(loadCounterNote.id)).body;
			};
			expect(await readLoadCounterNote()).toBe('');

			const writePluginScript = async (version: string, id: string) => {
				const script = `
					/* joplin-manifest:
					{
						"id": ${JSON.stringify(id)},
						"manifest_version": 1,
						"app_min_version": "1.0.0",
						"name": "JS Bundle test",
						"version": ${JSON.stringify(version)}
					}
					*/

					joplin.plugins.register({
						onStart: async function() {
							const noteId = ${JSON.stringify(loadCounterNote.id)};
							const pluginId = ${JSON.stringify(id)};
							const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });
							const newBody = note.body + '\\n' + pluginId;
							await joplin.data.put(['notes', noteId], null, { body: newBody.trim() });
						},
					});
				`;
				await fs.writeFile(join(testDir, `${id}.bundle.js`), script);
			};

			const service = newPluginService();
			const pluginId1 = 'org.joplinapp.testPlugin1';
			await writePluginScript('0.0.1', pluginId1);
			const pluginId2 = 'org.joplinapp.testPlugin2';
			await writePluginScript('0.0.1', pluginId2);

			let pluginSettings: PluginSettings = {
				[pluginId1]: defaultPluginSetting(),
				[pluginId2]: defaultPluginSetting(),
			};
			await service.loadAndRunPlugins(testDir, pluginSettings);

			// Plugins should initially load once
			expect(service.pluginIds).toHaveLength(2);
			expect(service.pluginById(pluginId1).running).toBe(true);
			expect(service.pluginById(pluginId2).running).toBe(true);
			expect(await readLoadCounterNote()).toBe(`${pluginId1}\n${pluginId2}`);

			// Updating just plugin 1 reload just plugin 1.
			await writePluginScript('0.0.2', pluginId1);
			await service.loadAndRunPlugins(testDir, pluginSettings);

			expect(service.pluginById(pluginId1).running).toBe(true);
			expect(service.pluginById(pluginId2).running).toBe(true);
			expect(await readLoadCounterNote()).toBe(`${pluginId1}\n${pluginId2}\n${pluginId1}`);

			// Disabling plugin 1 should not reload plugin 2
			pluginSettings = { ...pluginSettings, [pluginId1]: { ...defaultPluginSetting(), enabled: false } };
			await service.loadAndRunPlugins(testDir, pluginSettings);

			expect(service.pluginById(pluginId1).running).toBe(false);
			expect(service.pluginById(pluginId2).running).toBe(true);
			expect(await readLoadCounterNote()).toBe(`${pluginId1}\n${pluginId2}\n${pluginId1}`);

			await service.destroy();
		} finally {
			await fs.remove(testDir);
		}
	});
});
