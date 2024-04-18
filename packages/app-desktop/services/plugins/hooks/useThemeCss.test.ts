import { renderHook } from '@testing-library/react-hooks';
import useThemeCss from './useThemeCss';
import Setting from '@joplin/lib/models/Setting';

describe('useThemeCss', () => {
	it('should return a different path when the theme changes', async () => {
		const hookResult = renderHook(useThemeCss, {
			initialProps: { pluginId: 'testid', themeId: Setting.THEME_DARK },
		});

		await hookResult.waitFor(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_DARK}.css`);
		});

		hookResult.rerender({ pluginId: 'testid', themeId: Setting.THEME_LIGHT });

		await hookResult.waitFor(() => {
			expect(hookResult.result.current).toContain(`plugin_testid_theme_${Setting.THEME_LIGHT}.css`);
		});
	});
});
