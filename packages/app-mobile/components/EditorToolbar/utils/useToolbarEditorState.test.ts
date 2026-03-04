import { renderHook, act, waitFor } from '../../../utils/testing/testingLibrary';
import { setupDatabase, switchClient } from '@joplin/lib/testing/test-utils';
import useToolbarEditorState, { ReorderableItem } from './useToolbarEditorState';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import Setting from '@joplin/lib/models/Setting';

const createMockButtonInfo = (name: string, title: string): ToolbarButtonInfo => ({
	type: 'button',
	name,
	title,
	tooltip: title,
	iconName: `icon-${name}`,
	enabled: true,
	visible: true,
	onClick: jest.fn(),
});

describe('useToolbarEditorState', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
		Setting.setValue('editor.toolbarButtons', []);
	});

	const defaultAllCommandNames = [
		'attachFile',
		'-',
		'textBold',
		'textItalic',
		'-',
		'textCode',
		'textMath',
		'-',
		'hideKeyboard',
	];

	const defaultAllButtonInfos: ToolbarButtonInfo[] = [
		createMockButtonInfo('attachFile', 'Attach File'),
		createMockButtonInfo('textBold', 'Bold'),
		createMockButtonInfo('textItalic', 'Italic'),
		createMockButtonInfo('textCode', 'Code'),
		createMockButtonInfo('textMath', 'Math'),
		createMockButtonInfo('hideKeyboard', 'Hide Keyboard'),
	];

	const toNames = (items: ReorderableItem[]) => items.map(i => i.commandName);

	const renderToolbarHook = (initialSelectedCommandNames: string[]) => renderHook(() =>
		useToolbarEditorState({
			initialSelectedCommandNames,
			allCommandNames: defaultAllCommandNames,
			allButtonInfos: defaultAllButtonInfos,
		}),
	);

	it('should partition items into enabled and disabled, excluding separators', () => {
		const { result } = renderToolbarHook(['-', 'textBold', '-', 'textItalic']);

		expect(toNames(result.current.enabledItems)).toEqual(['textBold', 'textItalic']);
		expect(toNames(result.current.disabledItems)).toEqual([
			'attachFile', 'textCode', 'textMath', 'hideKeyboard',
		]);
		expect(toNames(result.current.disabledItems)).not.toContain('-');
	});

	it('handleMoveUp and handleMoveDown should reorder items and save, with no-op at boundaries', async () => {
		const { result } = renderToolbarHook(['textBold', 'textItalic', 'textCode']);

		// Move first item down
		await act(async () => { result.current.handleMoveDown(0); });
		expect(toNames(result.current.enabledItems)).toEqual(['textItalic', 'textBold', 'textCode']);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic', 'textBold', 'textCode']);
		});

		// Move it back up
		await act(async () => { result.current.handleMoveUp(1); });
		expect(toNames(result.current.enabledItems)).toEqual(['textBold', 'textItalic', 'textCode']);

		// No-op at boundaries: moving first item up or last item down should not change order
		const orderBefore = toNames(result.current.enabledItems);
		await act(async () => { result.current.handleMoveUp(0); });
		await act(async () => { result.current.handleMoveDown(2); });
		expect(toNames(result.current.enabledItems)).toEqual(orderBefore);
	});

	it('handleToggle should move items between enabled and disabled, preserve default order, and save', async () => {
		const { result } = renderToolbarHook(['textCode', 'textBold', 'textItalic']);

		// Toggle an enabled item off
		await act(async () => { result.current.handleToggle('textBold'); });
		expect(toNames(result.current.enabledItems)).toEqual(['textCode', 'textItalic']);
		expect(toNames(result.current.disabledItems)).toContain('textBold');
		// Disabled list should respect default order
		const disabled = toNames(result.current.disabledItems);
		expect(disabled.indexOf('attachFile')).toBeLessThan(disabled.indexOf('textBold'));
		expect(disabled.indexOf('textBold')).toBeLessThan(disabled.indexOf('textMath'));
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textCode', 'textItalic']);
		});

		// Toggle it back on: should append to end of enabled list
		await act(async () => { result.current.handleToggle('textBold'); });
		expect(toNames(result.current.enabledItems)).toEqual(['textCode', 'textItalic', 'textBold']);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textCode', 'textItalic', 'textBold']);
		});
	});

	it('reinitialize should reset state without saving to settings', async () => {
		const { result } = renderToolbarHook(['textBold', 'textItalic']);

		// Make a change first
		await act(async () => { result.current.handleMoveDown(0); });
		expect(toNames(result.current.enabledItems)).toEqual(['textItalic', 'textBold']);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic', 'textBold']);
		});

		// Reinitialize with a different selection (simulating Restore defaults)
		await act(async () => { result.current.reinitialize(['textCode', 'textMath']); });

		expect(toNames(result.current.enabledItems)).toEqual(['textCode', 'textMath']);
		expect(toNames(result.current.disabledItems)).toContain('textBold');
		expect(toNames(result.current.disabledItems)).toContain('textItalic');
		// Setting should not have been updated by reinitialize
		expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic', 'textBold']);
	});
});
