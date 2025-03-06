import { ElectronApplication } from '@playwright/test';

const setDarkMode = (app: ElectronApplication, darkMode: boolean) => {
	return app.evaluate(({ nativeTheme }, darkMode) => {
		nativeTheme.themeSource = darkMode ? 'dark' : 'light';
	}, darkMode);
};

export default setDarkMode;
