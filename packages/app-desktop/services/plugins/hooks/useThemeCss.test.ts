import { renderHook, waitFor } from '@testing-library/react';
import useThemeCss from './useThemeCss';
import Setting from '@joplin/lib/models/Setting';

describe('useThemeCss', () => {
	it('should return a different path when the theme changes', async () => {
		const hookResult = renderHook(useThemeCss, {
			initialProps: { pluginId: 'testid', themeId: Setting.THEME_DARK },
		});

		await waitFor(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_DARK}.css`);
		});

		hookResult.rerender({ pluginId: 'testid', themeId: Setting.THEME_LIGHT });

		await waitFor(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_LIGHT}.css`);
		});
	});
});
