import { createStore } from 'redux';
import CommandService from '../CommandService';
import ToolbarButtonUtils from './ToolbarButtonUtils';
import reducer, { defaultState } from '../../reducer';
import stateToWhenClauseContext from './stateToWhenClauseContext';
import KeymapService from '../KeymapService';

const createTestCommands = () => {
	const simpleCommands = [
		{ name: 'testCommand1', label: 'Test 1' },
		{ name: 'testCommand2', label: 'Test 2' },
	].map(({ name, label }) => ({
		declaration: {
			name,
			label: () => label,
			iconName: 'fa-times',
		},
		runtime: () => ({
			execute: () => Promise.resolve(),
		}),
	}));
	const commands = [
		...simpleCommands,
		{
			declaration: {
				name: 'invisibleUnlessTrashSelected',
				label: () => 'Invisible',
			},
			runtime: () => ({
				execute: () => Promise.resolve(),
				visibleCondition: 'inTrash',
			}),
		},
	];
	return commands;
};

describe('ToolbarButtonUtils', () => {
	beforeAll(() => {
		const store = createStore(reducer);
		CommandService.instance().initialize(store, false, stateToWhenClauseContext);

		const commands = createTestCommands();
		for (const command of commands) {
			CommandService.instance().registerDeclaration(command.declaration);
		}
		CommandService.instance().registerCommands(commands);
	});

	// The repo might have a global test mock cleaner which wipes the mock data after each test so I initialized a beforeEach() as test were failing before it
	beforeEach(()=>{
		// initialized the testCommand1 to have an accelerator of Ctrl + T
		jest.spyOn(KeymapService.instance(), 'getDefaultAccelerator').mockImplementation((commandName: string) => {
			if (commandName === 'testCommand1') return 'Ctrl+T';
			return '';
		});
	});

	test('should convert command names to toolbar buttons', () => {
		const utils = new ToolbarButtonUtils(CommandService.instance());
		const buttons = utils.commandsToToolbarButtons(
			['testCommand1', 'testCommand2'],
			stateToWhenClauseContext(defaultState),
		);
		expect(buttons).toMatchObject([
			{
				type: 'button',
				name: 'testCommand1',
				tooltip: 'Test 1 (Ctrl+T)',
				enabled: true,
			},
			{
				type: 'button',
				name: 'testCommand2',
				tooltip: 'Test 2',
				enabled: true,
			},
		]);
	});

	test('should not repeat separators', () => {
		const utils = new ToolbarButtonUtils(CommandService.instance());
		const buttons = utils.commandsToToolbarButtons(
			['testCommand2', '-', '-', '-', 'testCommand1'],
			stateToWhenClauseContext(defaultState),
		);
		expect(buttons).toMatchObject([
			{
				type: 'button',
				name: 'testCommand2',
			},
			{ type: 'separator' },
			{
				type: 'button',
				name: 'testCommand1',
			},
		]);
	});

	test('should not show invisible commands', () => {
		const utils = new ToolbarButtonUtils(CommandService.instance());
		const defaultContext = stateToWhenClauseContext(defaultState);

		expect(utils.commandsToToolbarButtons(
			['invisibleUnlessTrashSelected'],
			defaultContext,
		)).toMatchObject([]);

		expect(utils.commandsToToolbarButtons(
			['invisibleUnlessTrashSelected'],
			{ ...defaultContext, inTrash: true },
		)).toMatchObject([
			{ type: 'button', name: 'invisibleUnlessTrashSelected' },
		]);
	});

	// for security
	afterEach(()=>{
		jest.restoreAllMocks();
	});
});
