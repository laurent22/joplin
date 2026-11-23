import { getSelectedTabScrollOffset, getTabLayout } from './pluginPanelTabLayout';

describe('pluginPanelTabLayout', () => {
	test('keeps names uncapped when their natural row fits', () => {
		expect(getTabLayout(300, 350, 2)).toEqual({ overflow: false, tabWidth: 175 });
	});

	test('fills the selector if fixed tabs remove the overflow', () => {
		expect(getTabLayout(440, 350, 2)).toEqual({ overflow: true, tabWidth: 175 });
	});

	test('uses 160-width tabs when they still overflow', () => {
		expect(getTabLayout(800, 350, 4)).toEqual({ overflow: true, tabWidth: 160 });
	});

	test('scrolls an off-screen selected tab into view and leaves visible tabs in place', () => {
		expect(getSelectedTabScrollOffset(160, 4, 3, 350, 0)).toBe(290);
		expect(getSelectedTabScrollOffset(160, 4, 1, 350, 100)).toBe(100);
		expect(getSelectedTabScrollOffset(175, 2, 1, 350, 0)).toBe(0);
	});
});
