import MenuUtils from 'lib/services/commands/MenuUtils';
import ToolbarButtonUtils from 'lib/services/commands/ToolbarButtonUtils';
import CommandService, { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');

interface TestCommand {
	declaration: CommandDeclaration,
	runtime: CommandRuntime,
}

function newService():CommandService {
	const service = new CommandService();
	service.initialize({});
	return service;
}

function createCommand(name:string, options:any):TestCommand {
	const declaration:CommandDeclaration = {
		name: name,
	};

	const runtime:CommandRuntime = {
		execute: options.execute,
	};

	if (options.mapStateToProps) runtime.mapStateToProps = options.mapStateToProps;
	if (options.isEnabled) runtime.isEnabled = options.isEnabled;

	return { declaration, runtime };
}

function registerCommand(service:CommandService, cmd:TestCommand) {
	service.registerDeclaration(cmd.declaration);
	service.registerRuntime(cmd.declaration.name, cmd.runtime);
}

describe('services_CommandService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should create toolbar button infos from commands', asyncTest(async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		const executedCommands:string[] = [];

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

		const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons({}, ['test1', 'test2']);

		await toolbarInfos[0].onClick();
		await toolbarInfos[1].onClick();

		expect(executedCommands.join('_')).toBe('test1_test2');
		expect(toolbarInfos[0].enabled).toBe(true);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

	it('should enable and disable toolbar buttons depending on state', asyncTest(async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			mapStateToProps: (state:any) => {
				return {
					selectedNoteId: state.selectedNoteId,
					selectedFolderId: state.selectedFolderId,
				};
			},
			isEnabled: (props:any) => {
				return props.selectedNoteId === 'abc';
			},
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
			mapStateToProps: (state:any) => {
				return {
					selectedNoteId: state.selectedNoteId,
					selectedFolderId: state.selectedFolderId,
				};
			},
			isEnabled: (props:any) => {
				return props.selectedNoteId === '123';
			},
		}));

		const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons({
			selectedNoteId: '123',
			selectedFolderId: 'aaa',
		}, ['test1', 'test2']);

		expect(toolbarInfos[0].enabled).toBe(false);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

	it('should return the same toolbarButtons array if nothing has changed', asyncTest(async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			mapStateToProps: (state:any) => {
				return {
					selectedNoteId: state.selectedNoteId,
				};
			},
			isEnabled: (props:any) => {
				return props.selectedNoteId === 'ok';
			},
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
			mapStateToProps: (state:any) => {
				return {
					selectedFolderId: state.selectedFolderId,
				};
			},
			isEnabled: (props:any) => {
				return props.selectedFolderId === 'ok';
			},
		}));

		const toolbarInfos1 = toolbarButtonUtils.commandsToToolbarButtons({
			selectedNoteId: 'ok',
			selectedFolderId: 'notok',
		}, ['test1', 'test2']);

		const toolbarInfos2 = toolbarButtonUtils.commandsToToolbarButtons({
			selectedNoteId: 'ok',
			selectedFolderId: 'notok',
		}, ['test1', 'test2']);

		expect(toolbarInfos1).toBe(toolbarInfos2);
		expect(toolbarInfos1[0] === toolbarInfos2[0]).toBe(true);
		expect(toolbarInfos1[1] === toolbarInfos2[1]).toBe(true);

		const toolbarInfos3 = toolbarButtonUtils.commandsToToolbarButtons({
			selectedNoteId: 'ok',
			selectedFolderId: 'ok',
		}, ['test1', 'test2']);

		expect(toolbarInfos2 === toolbarInfos3).toBe(false);
		expect(toolbarInfos2[0] === toolbarInfos3[0]).toBe(true);
		expect(toolbarInfos2[1] === toolbarInfos3[1]).toBe(false);

		{
			expect(toolbarButtonUtils.commandsToToolbarButtons({
				selectedNoteId: 'ok',
				selectedFolderId: 'notok',
			}, ['test1', '-', 'test2'])).toBe(toolbarButtonUtils.commandsToToolbarButtons({
				selectedNoteId: 'ok',
				selectedFolderId: 'notok',
			}, ['test1', '-', 'test2']));
		}
	}));

	it('should create menu items from commands', asyncTest(async () => {
		const service = newService();
		const utils = new MenuUtils(service);

		registerCommand(service, createCommand('test1', {
			execute: () => {},
		}));

		registerCommand(service, createCommand('test2', {
			execute: () => {},
		}));

		const clickedCommands:string[] = [];

		const onClick = (commandName:string) => {
			clickedCommands.push(commandName);
		};

		const menuItems = utils.commandsToMenuItems(['test1', 'test2'], onClick);

		menuItems.test1.click();
		menuItems.test2.click();

		expect(clickedCommands.join('_')).toBe('test1_test2');

		// Also check that the same commands always return strictly the same menu
		expect(utils.commandsToMenuItems(['test1', 'test2'], onClick)).toBe(utils.commandsToMenuItems(['test1', 'test2'], onClick));
	}));

	it('should give menu item props from state', asyncTest(async () => {
		const service = newService();
		const utils = new MenuUtils(service);

		registerCommand(service, createCommand('test1', {
			mapStateToProps: (state:any) => {
				return {
					isOk: state.test1 === 'ok',
				};
			},
			execute: () => {},
		}));

		registerCommand(service, createCommand('test2', {
			mapStateToProps: (state:any) => {
				return {
					isOk: state.test2 === 'ok',
				};
			},
			execute: () => {},
		}));

		{
			const menuItemProps = utils.commandsToMenuItemProps({
				test1: 'ok',
				test2: 'notok',
			}, ['test1', 'test2']);

			expect(menuItemProps.test1.isOk).toBe(true);
			expect(menuItemProps.test2.isOk).toBe(false);
		}

		{
			const menuItemProps = utils.commandsToMenuItemProps({
				test1: 'ok',
				test2: 'ok',
			}, ['test1', 'test2']);

			expect(menuItemProps.test1.isOk).toBe(true);
			expect(menuItemProps.test2.isOk).toBe(true);
		}

		expect(utils.commandsToMenuItemProps({
			test1: 'ok',
			test2: 'ok',
		}, ['test1', 'test2'])).toBe(utils.commandsToMenuItemProps({
			test1: 'ok',
			test2: 'ok',
		}, ['test1', 'test2']));
	}));

	it('should create stateful menu items', asyncTest(async () => {
		const service = newService();
		const utils = new MenuUtils(service);

		let propValue = null;

		registerCommand(service, createCommand('test1', {
			mapStateToProps: (state:any) => {
				return {
					isOk: state.test1 === 'ok',
				};
			},
			execute: (props:any) => {
				propValue = props.isOk;
			},
		}));

		const menuItem = utils.commandToStatefulMenuItem('test1', { isOk: 'hello' });
		menuItem.click();

		expect(propValue).toBe('hello');
	}));

	it('should allow isEnabled expressions', asyncTest(async () => {
		const service = newService();

		registerCommand(service, createCommand('test1', {
			isEnabled: 'selectedNoteCount == 1 && isMarkdownEditor',
			execute: () => {},
		}));

		expect(service.isEnabled('test1', null, {
			selectedNoteCount: 2,
			isMarkdownEditor: true,
		})).toBe(false);

		expect(service.isEnabled('test1', null, {
			selectedNoteCount: 1,
			isMarkdownEditor: true,
		})).toBe(true);

		expect(service.isEnabled('test1', null, {
			selectedNoteCount: 1,
			isMarkdownEditor: false,
		})).toBe(false);
	}));

	it('should enable and disable toolbar buttons depending on boolean expression', asyncTest(async () => {
		const service = newService();
		const toolbarButtonUtils = new ToolbarButtonUtils(service);

		const state:any = {
			selectedNoteIds: ['note1', 'note2'],
		};

		registerCommand(service, createCommand('test1', {
			execute: () => {},
			isEnabled: 'selectedNoteCount == 1 && selectedNoteId == note2',
		}));

		{
			const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(state, ['test1']);
			expect(toolbarInfos[0].enabled).toBe(false);
		}

		{
			state.selectedNoteIds = ['note1'];
			const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(state, ['test1']);
			expect(toolbarInfos[0].enabled).toBe(false);
		}

		{
			state.selectedNoteIds = ['note2'];
			const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(state, ['test1']);
			expect(toolbarInfos[0].enabled).toBe(true);
		}
	}));

});
