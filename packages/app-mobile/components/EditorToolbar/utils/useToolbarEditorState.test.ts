import { renderHook, act } from '../../../utils/testing/testingLibrary';
import useToolbarEditorState, { ReorderableItem } from './useToolbarEditorState';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';

// Mock Setting.setValue
jest.mock('@joplin/lib/models/Setting', () => ({
	__esModule: true,
	default: {
		setValue: jest.fn(),
	},
}));

// Get reference to the mock after module is loaded
import Setting from '@joplin/lib/models/Setting';
const mockSetValue = Setting.setValue as jest.Mock;

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
	beforeEach(() => {
		jest.clearAllMocks();
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

	it('handleMoveUp(0) should be a no-op', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		const initialOrder = result.current.enabledItems.map((i: ReorderableItem) => i.commandName);

		act(() => {
			result.current.handleMoveUp(0);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(initialOrder);
		// Setting should not be called for a no-op
		expect(mockSetValue).not.toHaveBeenCalled();
	});

	it('handleMoveDown on last item should be a no-op', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		const initialOrder = result.current.enabledItems.map((i: ReorderableItem) => i.commandName);

		act(() => {
			result.current.handleMoveDown(1); // Last index
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(initialOrder);
		expect(mockSetValue).not.toHaveBeenCalled();
	});

	it('handleMoveUp(1) should swap items 0 and 1 and save', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic', 'textCode'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		act(() => {
			result.current.handleMoveUp(1);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textItalic',
			'textBold',
			'textCode',
		]);
		expect(mockSetValue).toHaveBeenCalledWith('editor.toolbarButtons', [
			'textItalic',
			'textBold',
			'textCode',
		]);
	});

	it('handleMoveDown should swap adjacent items and save', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic', 'textCode'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		act(() => {
			result.current.handleMoveDown(0);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textItalic',
			'textBold',
			'textCode',
		]);
		expect(mockSetValue).toHaveBeenCalledWith('editor.toolbarButtons', [
			'textItalic',
			'textBold',
			'textCode',
		]);
	});

	it('handleToggle on enabled item should move it to disabled and save', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		act(() => {
			result.current.handleToggle('textBold');
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textItalic']);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textBold');
		expect(mockSetValue).toHaveBeenCalledWith('editor.toolbarButtons', ['textItalic']);
	});

	it('handleToggle on disabled item should append it to end of enabled and save', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		act(() => {
			result.current.handleToggle('textCode');
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual([
			'textBold',
			'textCode',
		]);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).not.toContain('textCode');
		expect(mockSetValue).toHaveBeenCalledWith('editor.toolbarButtons', [
			'textBold',
			'textCode',
		]);
	});

	it('reinitialize should reset state without saving to settings', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		// Make a change first
		act(() => {
			result.current.handleMoveDown(0);
		});
		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textItalic', 'textBold']);
		mockSetValue.mockClear();

		// Reinitialize with a different selection (simulating Restore defaults)
		act(() => {
			result.current.reinitialize(['textCode', 'textMath']);
		});

		expect(result.current.enabledItems.map((i: ReorderableItem) => i.commandName)).toEqual(['textCode', 'textMath']);
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textBold');
		expect(result.current.disabledItems.map((i: ReorderableItem) => i.commandName)).toContain('textItalic');
		// Should not save to settings on reinitialize
		expect(mockSetValue).not.toHaveBeenCalled();
	});

	it('disabled items should maintain default-relative order when items are toggled off', () => {
		const { result } = renderHook(() =>
			useToolbarEditorState({
				initialSelectedCommandNames: ['textCode', 'textBold', 'textItalic'],
				allCommandNames: defaultAllCommandNames,
				allButtonInfos: defaultAllButtonInfos,
			}),
		);

		// Toggle off textBold - it should appear in disabled list in its default position
		act(() => {
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
