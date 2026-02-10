import { renderHook } from '@testing-library/react-hooks/pure';
import useThemeCss from './useThemeCss';
import Setting from '@joplin/lib/models/Setting';
import { waitForHook } from '@joplin/lib/testing/test-utils';

describe('useThemeCss', () => {
	it('should return a different path when the theme changes', async () => {
		const hookResult = renderHook(useThemeCss, {
			initialProps: { pluginId: 'testid', themeId: Setting.THEME_DARK },
		});

		await waitForHook(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_DARK}.css`);
		});

		hookResult.rerender({ pluginId: 'testid', themeId: Setting.THEME_LIGHT });

		await waitForHook(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_LIGHT}.css`);
		});
	});
});
