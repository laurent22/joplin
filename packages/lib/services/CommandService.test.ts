import MenuUtils from '../services/commands/MenuUtils';
import ToolbarButtonUtils from '../services/commands/ToolbarButtonUtils';
import CommandService, { CommandDeclaration, CommandRuntime } from '../services/CommandService';
import stateToWhenClauseContext from '../services/commands/stateToWhenClauseContext';
import KeymapService from '../services/KeymapService';
import { setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } from '../testing/test-utils';

interface TestCommand {
	declaration: CommandDeclaration;
	runtime: CommandRuntime;
}

function newService(): CommandService {
	const service = new CommandService();
	const mockStore = {
		getState: () => {
			return {};
		},
	};
	service.initialize(mockStore, true, stateToWhenClauseContext);
	return service;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function createCommand(name: string, options: any): TestCommand {
	const declaration: CommandDeclaration = {
		name: name,
	};

	const runtime: CommandRuntime = {
		execute: options.execute,
	};

	if (options.getPriority) runtime.getPriority = options.getPriority;
	if (options.enabledCondition) runtime.enabledCondition = options.enabledCondition;

	return { declaration, runtime };
}

function registerCommand(service: CommandService, cmd: TestCommand) {
	service.registerDeclaration(cmd.declaration);
	return service.registerRuntime(cmd.declaration.name, cmd.runtime);
}

const registerSecondaryRuntime = (service: CommandService, commandName: string, runtime: CommandRuntime) => {
	return service.registerRuntime(commandName, runtime, true);
};

describe('services_CommandService', () => {

	beforeEach(async () => {
		KeymapService.destroyInstance();
		KeymapService.instance().initialize();

		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create toolbar button infos from commands', (async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		const executedCommands: string[] = [];

		registerCommand(service, createCommand('test1', {
			execute: () => {
				executedCommands.push('test1');
			},
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {
				executedCommands.push('test2');
			},
		}));

		const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {});

		await toolbarInfos[0].onClick();
		await toolbarInfos[1].onClick();

		expect(executedCommands.join('_')).toBe('test1_test2');
		expect(toolbarInfos[0].enabled).toBe(true);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

	it('should enable and disable toolbar buttons depending on state', (async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			enabledCondition: 'oneNoteSelected',
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
			enabledCondition: 'multipleNotesSelected',
		}));

		const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
			oneNoteSelected: false,
			multipleNotesSelected: true,
		});

		expect(toolbarInfos[0].enabled).toBe(false);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

	it('should enable commands by default', (async () => {
		const service = newService();

		registerCommand(service, createCommand('test1', {
			execute: () => {},
		}));

		expect(service.isEnabled('test1', {})).toBe(true);
	}));

	it('should return the same toolbarButtons array if nothing has changed', (async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			enabledCondition: 'cond1',
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
			enabledCondition: 'cond2',
		}));

		const toolbarInfos1 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
			cond1: true,
			cond2: false,
		});

		const toolbarInfos2 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
			cond1: true,
			cond2: false,
		});

		expect(toolbarInfos1).toBe(toolbarInfos2);
		expect(toolbarInfos1[0] === toolbarInfos2[0]).toBe(true);
		expect(toolbarInfos1[1] === toolbarInfos2[1]).toBe(true);

		const toolbarInfos3 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
			cond1: true,
			cond2: true,
		});

		expect(toolbarInfos2 === toolbarInfos3).toBe(false);
		expect(toolbarInfos2[0] === toolbarInfos3[0]).toBe(true);
		expect(toolbarInfos2[1] === toolbarInfos3[1]).toBe(false);

		{
			expect(toolbarButtonUtils.commandsToToolbarButtons(['test1', '-', 'test2'], {
				cond1: true,
				cond2: false,
			})).toBe(toolbarButtonUtils.commandsToToolbarButtons(['test1', '-', 'test2'], {
				cond1: true,
				cond2: false,
			}));
		}
	}));

	it('should support multiple runtimes for a command', async () => {
		const service = newService();

		const execute1 = jest.fn();
		const execute2 = jest.fn();

		const firstRuntime = registerCommand(service, createCommand('test1', {
			execute: execute1,
			getPriority: () => 1,
		}));

		registerSecondaryRuntime(service, 'test1', {
			execute: execute2,
		});

		await service.execute('test1');

		// Should prefer commands with a positive specified priority
		expect(execute2).not.toHaveBeenCalled();
		expect(execute1).toHaveBeenCalledTimes(1);

		// Should be possible to deregister just one runtime
		firstRuntime.deregister();

		await service.execute('test1');
		expect(execute1).toHaveBeenCalledTimes(1);
		expect(execute2).toHaveBeenCalledTimes(1);
	});

	it('should create menu items from commands', (async () => {
		const service = newService();
		const utils = new MenuUtils(service);
		const locale = 'fr_FR';

		registerCommand(service, createCommand('test1', {
			execute: () => {},
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
		}));

		const clickedCommands: string[] = [];

		const onClick = (commandName: string) => {
			clickedCommands.push(commandName);
		};

		const menuItems = utils.commandsToMenuItems(['test1', 'test2'], onClick, locale);

		menuItems.test1.click();
		menuItems.test2.click();

		expect(clickedCommands.join('_')).toBe('test1_test2');

		// Also check that the same commands always return strictly the same menu
		expect(utils.commandsToMenuItems(['test1', 'test2'], onClick, locale)).toBe(utils.commandsToMenuItems(['test1', 'test2'], onClick, locale));

		// And check that if the locale changes, new menu items are returned
		expect(utils.commandsToMenuItems(['test1', 'test2'], onClick, locale)).not.toBe(utils.commandsToMenuItems(['test1', 'test2'], onClick, 'en_GB'));
	}));

	it('should give menu item props from state', (async () => {
		const service = newService();
		const utils = new MenuUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			enabledCondition: 'cond1',
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
			enabledCondition: 'cond2',
		}));

		{
			const menuItemProps = utils.commandsToMenuItemProps(['test1', 'test2'], {
				cond1: true,
				cond2: false,
			});

			expect(menuItemProps.test1.enabled).toBe(true);
			expect(menuItemProps.test2.enabled).toBe(false);
		}

		{
			const menuItemProps = utils.commandsToMenuItemProps(['test1', 'test2'], {
				cond1: true,
				cond2: true,
			});

			expect(menuItemProps.test1.enabled).toBe(true);
			expect(menuItemProps.test2.enabled).toBe(true);
		}

		expect(utils.commandsToMenuItemProps(['test1', 'test2'], { cond1: true, cond2: true }))
			.toBe(utils.commandsToMenuItemProps(['test1', 'test2'], { cond1: true, cond2: true }));
	}));

	it('should create stateful menu items', (async () => {
		const service = newService();
		const utils = new MenuUtils(service);

		let propValue = null;

		registerCommand(service, createCommand('test1', {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			execute: (_context: any, greeting: string) => {
				propValue = greeting;
			},
		}));

		const menuItem = utils.commandToStatefulMenuItem('test1', 'hello');
		menuItem.click();

		expect(propValue).toBe('hello');
	}));

	it('should throw an error for invalid when clause keys in dev mode', (async () => {
		const service = newService();

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			enabledCondition: 'cond1 && cond2',
		}));

		await expectThrow(async () => service.isEnabled('test1', {}));
		await expectThrow(async () => service.isEnabled('test1', { cond1: true }));
		await expectNotThrow(async () => service.isEnabled('test1', { cond1: true, cond2: true }));
		await expectNotThrow(async () => service.isEnabled('test1', { cond1: true, cond2: false }));
	}));

	it('commands should allow specifying an icon', () => {
		const service = newService();

		const iconName = 'fas fa-check';
		registerCommand(service, {
			declaration: {
				name: 'test-command-with-icon',
				label: 'Adding icons to commands',
				iconName,
			},
			runtime: {
				execute: async () => {},
			},
		});

		const command = service.commandByName('test-command-with-icon');
		expect(command.declaration.iconName).toBe(iconName);
	});

	it('commands should have a non-empty default icon', () => {
		const service = newService();

		registerCommand(service, {
			declaration: {
				name: 'test1',
				label: 'Test toolbar icon',
			},
			runtime: {
				execute: async () => {},
			},
		});

		const command = service.commandByName('test1');
		expect(command.declaration.iconName).toBe('fas fa-cog');
	});
});
