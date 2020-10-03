import CommandService, { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');

interface TestCommand {
	declaration: CommandDeclaration,
	runtime: CommandRuntime,
}

function newService():CommandService {
	const service = new CommandService();
	service.initialize({}, null);
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

	it('should register and execute commands', asyncTest(async () => {
		const service = newService();

		let wasExecuted = false;

		registerCommand(service, createCommand('test1', {
			execute: () => {
				wasExecuted = true;
			},
		}));

		await service.execute('test1');

		expect(wasExecuted).toBe(true);
	}));

	it('should pass props to commands', asyncTest(async () => {
		const service = newService();

		let receivedProps:any = {};

		registerCommand(service, createCommand('test1', {
			execute: (props:any) => {
				receivedProps = props;
			},
			mapStateToProps: (state:any) => {
				return {
					selectedNoteId: state.selectedNoteId,
					selectedFolderId: state.selectedFolderId,
				};
			},
		}));

		service.commandsToToolbarButtons({
			selectedNoteId: '123',
			selectedFolderId: 'abc',
		}, ['test1']);

		await service.execute('test1');

		expect(receivedProps.selectedNoteId).toBe('123');
		expect(receivedProps.selectedFolderId).toBe('abc');
	}));

	it('should create toolbar button infos from commands', asyncTest(async () => {
		const service = newService();

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

		const toolbarInfos = service.commandsToToolbarButtons({}, ['test1', 'test2']);

		await toolbarInfos[0].onClick();
		await toolbarInfos[1].onClick();

		expect(executedCommands.join('_')).toBe('test1_test2');
		expect(toolbarInfos[0].enabled).toBe(true);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

	it('should enable and disable toolbar buttons depending on state', asyncTest(async () => {
		const service = newService();

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

		const toolbarInfos = service.commandsToToolbarButtons({
			selectedNoteId: '123',
			selectedFolderId: 'aaa',
		}, ['test1', 'test2']);

		expect(toolbarInfos[0].enabled).toBe(false);
		expect(toolbarInfos[1].enabled).toBe(true);
	}));

});
