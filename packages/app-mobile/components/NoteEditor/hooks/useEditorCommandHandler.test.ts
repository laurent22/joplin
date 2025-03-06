/** @jest-environment jsdom */

import CommandService from '@joplin/lib/services/CommandService';
import useEditorCommandHandler from './useEditorCommandHandler';
import commandDeclarations from '../commandDeclarations';
import createTestEditorControl from '@joplin/editor/CodeMirror/testUtil/createEditorControl';
import { renderHook } from '@testing-library/react-native';
import { defaultState } from '@joplin/lib/reducer';


describe('useEditorCommandHandler', () => {
	beforeAll(() => {
		const storeMock = { getState: () => defaultState, dispatch: jest.fn() };
		CommandService.instance().initialize(storeMock, false, ()=>({}));

		for (const declaration of commandDeclarations) {
			CommandService.instance().registerDeclaration(declaration);
		}
	});
	it('should support running custom commands with editor.execCommand', async () => {
		const editor = createTestEditorControl('Test.');
		renderHook(() => useEditorCommandHandler(editor));

		const testCommandCallback = jest.fn();
		editor.registerCommand('myCommand', testCommandCallback);
		expect(testCommandCallback).not.toHaveBeenCalled();

		// Should support running commands with arguments
		await CommandService.instance().execute('editor.execCommand', { name: 'myCommand', args: ['a', 'b', 'c'] });
		expect(testCommandCallback).toHaveBeenCalledTimes(1);
		expect(testCommandCallback).toHaveBeenLastCalledWith('a', 'b', 'c');

		// Should support running commands without arguments
		await CommandService.instance().execute('editor.execCommand', { name: 'myCommand' });
		expect(testCommandCallback).toHaveBeenCalledTimes(2);
		expect(testCommandCallback).toHaveBeenLastCalledWith();
	});
});
