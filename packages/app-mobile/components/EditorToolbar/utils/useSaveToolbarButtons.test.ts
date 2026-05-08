import { renderHook, act, waitFor } from '../../../utils/testing/testingLibrary';
import { setupDatabase, switchClient } from '@joplin/lib/testing/test-utils';
import useSaveToolbarButtons from './useSaveToolbarButtons';
import { ReorderableItem } from './useToolbarEditorState';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import Setting from '@joplin/lib/models/Setting';

const mockItem = (name: string): ReorderableItem => ({
	commandName: name,
	buttonInfo: {
		type: 'button',
		name,
		title: name,
		tooltip: name,
		iconName: `icon-${name}`,
		enabled: true,
		visible: true,
		onClick: jest.fn(),
	} as ToolbarButtonInfo,
});

describe('useSaveToolbarButtons', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
		Setting.setValue('editor.toolbarButtons', []);
	});

	it('should not save on initial mount', async () => {
		const isReinitializing = { current: false };
		renderHook(() => useSaveToolbarButtons([mockItem('textBold')], isReinitializing));
		// Wait a tick to ensure the effect has run
		await act(async () => {});
		expect(Setting.value('editor.toolbarButtons')).toEqual([]);
	});

	it('should save when enabledItems changes after initial mount', async () => {
		const isReinitializing = { current: false };
		const { rerender } = renderHook(
			({ items }: { items: ReorderableItem[] }) => useSaveToolbarButtons(items, isReinitializing),
			{ initialProps: { items: [mockItem('textBold')] } },
		);

		rerender({ items: [mockItem('textBold'), mockItem('textItalic')] });

		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textBold', 'textItalic']);
		});
	});

	it('should not save when isReinitializing is set, and should reset the flag', async () => {
		const isReinitializing = { current: false };
		const { rerender } = renderHook(
			({ items }: { items: ReorderableItem[] }) => useSaveToolbarButtons(items, isReinitializing),
			{ initialProps: { items: [mockItem('textBold')] } },
		);

		// First do a real save so the initial-mount skip is consumed
		rerender({ items: [mockItem('textBold'), mockItem('textItalic')] });
		await waitFor(() => {
			expect(Setting.value('editor.toolbarButtons')).toEqual(['textBold', 'textItalic']);
		});

		// Now simulate reinitialize
		isReinitializing.current = true;
		rerender({ items: [mockItem('textCode')] });

		// Give the effect time to run
		await act(async () => {});
		// Setting should be unchanged
		expect(Setting.value('editor.toolbarButtons')).toEqual(['textBold', 'textItalic']);
		// Flag should have been reset
		expect(isReinitializing.current).toBe(false);
	});
});
