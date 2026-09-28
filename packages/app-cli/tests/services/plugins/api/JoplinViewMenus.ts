import KeymapService from '@joplin/lib/services/KeymapService';
import { setupDatabaseAndSynchronizer, switchClient, afterEachCleanUp } from '@joplin/lib/testing/test-utils';
import { newPluginScript, newPluginService } from '../../../testUtils';

describe('JoplinViewMenus', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		await afterEachCleanUp();
	});

	test('should register menu commands with the keymap service, even without an accelerator', async () => {
		const service = newPluginService();

		KeymapService.instance().initialize();

		const pluginScript = newPluginScript(`
			joplin.plugins.register({
				onStart: async function() {
					for (const name of ['testCommand1', 'testCommand2', 'testCommand3']) {
						await joplin.commands.register({
							name,
							label: name,
							execute: async () => {},
						});
					}

					await joplin.views.menus.create('myMenu', 'My Menu', [
						{ commandName: 'testCommand1' },
						{
							label: 'My Submenu',
							submenu: [
								{ commandName: 'testCommand2' },
							],
						},
						{ commandName: 'testCommand3', accelerator: 'CmdOrCtrl+Alt+Shift+C' },
					], 'tools');
				},
			});
		`);

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const keymapService = KeymapService.instance();
		const commandNames = keymapService.getCommandNames();

		expect(commandNames.includes('testCommand1')).toBe(true);
		expect(commandNames.includes('testCommand2')).toBe(true);
		expect(commandNames.includes('testCommand3')).toBe(true);

		expect(keymapService.getAccelerator('testCommand1')).toBe(null);
		expect(keymapService.getAccelerator('testCommand2')).toBe(null);
		expect(keymapService.getAccelerator('testCommand3')).not.toBe(null);

		await service.destroy();
	});

});
