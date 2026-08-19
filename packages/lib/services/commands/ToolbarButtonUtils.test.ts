import { createStore } from 'redux';
import CommandService from '../CommandService';
import ToolbarButtonUtils from './ToolbarButtonUtils';
import reducer, { defaultState } from '../../reducer';
import stateToWhenClauseContext from './stateToWhenClauseContext';
import KeymapService from '../KeymapService';
import shim from '../../shim';

const createTestCommands = () => {
	const simpleCommands = [
		{ name: 'newNote', label: 'New Note' },
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
	let keymapService: KeymapService;

	beforeAll(() => {
		const store = createStore(reducer);
		CommandService.instance().initialize(store, false, stateToWhenClauseContext);

		// Boot up the real service
		KeymapService.destroyInstance();
		keymapService = KeymapService.instance();
		keymapService.initialize();

		const commands = createTestCommands();
		for (const command of commands) {
			CommandService.instance().registerDeclaration(command.declaration);
		}
		CommandService.instance().registerCommands(commands);
	});

	test('should convert command names to toolbar buttons', () => {
		const utils = new ToolbarButtonUtils(CommandService.instance());
		const buttons = utils.commandsToToolbarButtons(
			['newNote', 'testCommand2'],
			stateToWhenClauseContext(defaultState),
			keymapService,
		);

		const expectedTooltip = shim.isMac() ? 'New Note (Cmd+N)' : 'New Note (Ctrl+N)';

		expect(buttons).toMatchObject([
			{
				type: 'button',
				name: 'newNote',
				tooltip: expectedTooltip,
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
			['testCommand2', '-', '-', '-', 'newNote'],
			stateToWhenClauseContext(defaultState),
			keymapService,
		);
		expect(buttons).toMatchObject([
			{
				type: 'button',
				name: 'testCommand2',
			},
			{ type: 'separator' },
			{
				type: 'button',
				name: 'newNote',
			},
		]);
	});

	test('should not show invisible commands', () => {
		const utils = new ToolbarButtonUtils(CommandService.instance());
		const defaultContext = stateToWhenClauseContext(defaultState);

		expect(utils.commandsToToolbarButtons(
			['invisibleUnlessTrashSelected'],
			defaultContext,
			keymapService,
		)).toMatchObject([]);

		expect(utils.commandsToToolbarButtons(
			['invisibleUnlessTrashSelected'],
			{ ...defaultContext, inTrash: true },
			keymapService,
		)).toMatchObject([
			{ type: 'button', name: 'invisibleUnlessTrashSelected' },
		]);
	});
});
