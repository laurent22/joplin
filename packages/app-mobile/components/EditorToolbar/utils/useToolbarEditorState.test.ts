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

	it('should partition items into enabled and disabled based on initialSelectedCommandNames', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		expect(result.current.enabledItems).toHaveLength(2);
		expect(result.current.enabledItems[0].commandName).toBe('textBold');
		expect(result.current.enabledItems[1].commandName).toBe('textItalic');

		// Disabled items should be the rest, in default order
		expect(result.current.disabledItems).toHaveLength(4);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'attachFile',
			'textCode',
			'textMath',
			'hideKeyboard',
		]);
	});

	it('should exclude separators from both lists', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['-', 'textBold', '-'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		// Should only have textBold, separators filtered out
		expect(result.current.enabledItems).toHaveLength(1);
		expect(result.current.enabledItems[0].commandName).toBe('textBold');

		// Disabled should not include separators either
		const disabledNames = result.current.disabledItems.map((i: ReorderableItem) => i.commandName);
		expect(disabledNames).not.toContain('-');
	});

	it('handleMoveUp(0) should be a no-op', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		const initialOrder = result.current.enabledItems.map((i: ReorderableItem) => i.commandName);

		await act(async () => {
			result.current.handleMoveUp(0);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(initialOrder);
		// Setting should not be saved for a no-op
		expect(Setting.value('editor.toolbarButtons')).toEqual([]);
	});

	it('handleMoveDown on last item should be a no-op', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		const initialOrder = result.current.enabledItems.map((i: ReorderableItem) => i.commandName);

		await act(async () => {
			result.current.handleMoveDown(1); // Last index
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(initialOrder);
		expect(Setting.value('editor.toolbarButtons')).toEqual([]);
	});

	it('handleMoveUp(1) should swap items 0 and 1 and save', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic', 'textCode'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		await act(async () => {
			result.current.handleMoveUp(1);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textItalic',
			'textBold',
			'textCode',
		]);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual([
				'textItalic',
				'textBold',
				'textCode',
			]);
		});
	});

	it('handleMoveDown should swap adjacent items and save', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic', 'textCode'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		await act(async () => {
			result.current.handleMoveDown(0);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textItalic',
			'textBold',
			'textCode',
		]);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual([
				'textItalic',
				'textBold',
				'textCode',
			]);
		});
	});

	it('handleToggle on enabled item should move it to disabled and save', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		await act(async () => {
			result.current.handleToggle('textBold');
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textItalic']);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textBold');
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic']);
		});
	});

	it('handleToggle on disabled item should append it to end of enabled and save', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		await act(async () => {
			result.current.handleToggle('textCode');
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textBold',
			'textCode',
		]);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).not.toContain('textCode');
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual([
				'textBold',
				'textCode',
			]);
		});
	});

	it('reinitialize should reset state without saving to settings', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		// Make a change first
		await act(async () => {
			result.current.handleMoveDown(0);
		});
		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textItalic', 'textBold']);
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic', 'textBold']);
		});

		// Reinitialize with a different selection (simulating Restore defaults)
		await act(async () => {
			result.current.reinitialize(['textCode', 'textMath']);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textCode', 'textMath']);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textBold');
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textItalic');
		// Setting should not have been updated by reinitialize
		expect(Setting.value('editor.toolbarButtons')).toEqual(['textItalic', 'textBold']);
	});

	it('disabled items should maintain default-relative order when items are toggled off', async () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textCode', 'textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		// Toggle off textBold - it should appear in disabled list in its default position
		await act(async () => {
			result.current.handleToggle('textBold');
		});

		// Disabled items should be in default order: attachFile, textBold, textMath, hideKeyboard
		const disabledNames = result.current.disabledItems.map((i: ReorderableItem) => i.commandName);
		const boldIndex = disabledNames.indexOf('textBold');
		const attachFileIndex = disabledNames.indexOf('attachFile');
		const textMathIndex = disabledNames.indexOf('textMath');

		// textBold should come after attachFile and before textMath in default order
		expect(attachFileIndex).toBeLessThan(boldIndex);
		expect(boldIndex).toBeLessThan(textMathIndex);
	});
});
