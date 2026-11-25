import { act, renderHook } from '../../../../utils/testing/testingLibrary';
import { setupDatabase, switchClient } from '@joplin/lib/testing/test-utils';
import Setting from '@joplin/lib/models/Setting';
import useSelectedTabId from './useSelectedTabId';

const firstTab = { value: 'first', label: 'First plugin' };
const rememberedTab = { value: 'remembered', label: 'Remembered plugin' };

describe('useSelectedTabId', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
		Setting.setValue('ui.lastSelectedPluginPanel', rememberedTab.value);
	});

	test('restores the saved tab after another plugin panel loads first', () => {
		const { result, rerender } = renderHook(
			({ tabs }: { tabs: typeof firstTab[] }) => useSelectedTabId(tabs),
			{ initialProps: { tabs: [] } },
		);

		rerender({ tabs: [firstTab] });
		expect(result.current.selectedTabId).toBe(firstTab.value);
		expect(Setting.value('ui.lastSelectedPluginPanel')).toBe(rememberedTab.value);

		rerender({ tabs: [firstTab, rememberedTab] });
		expect(result.current.selectedTabId).toBe(rememberedTab.value);
	});

	test('keeps a manual selection when the saved tab loads later', () => {
		const { result, rerender } = renderHook(
			({ tabs }: { tabs: typeof firstTab[] }) => useSelectedTabId(tabs),
			{ initialProps: { tabs: [firstTab] } },
		);

		act(() => result.current.setSelectedTabId(firstTab.value));
		expect(Setting.value('ui.lastSelectedPluginPanel')).toBe(firstTab.value);

		rerender({ tabs: [firstTab, rememberedTab] });
		expect(result.current.selectedTabId).toBe(firstTab.value);
	});
});
