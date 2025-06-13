import { ElectronApplication } from '@playwright/test';
import evaluateWithRetry from './evaluateWithRetry';

const setDarkMode = (app: ElectronApplication, darkMode: boolean) => {
	return evaluateWithRetry(app, ({ nativeTheme }, darkMode) => {
		nativeTheme.themeSource = darkMode ? 'dark' : 'light';
	}, darkMode);
};

export default setDarkMode;
