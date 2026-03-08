import { join } from 'path';
import { pathExistsSync, readFileSync } from 'fs-extra';

// Determines whether the splash screen should be shown on startup.
// Skips when the user has configured startMinimized + showTrayIcon,
// since there's no point showing a splash they don't want to see.
export default function shouldShowSplash(profilePath: string): boolean {
	const settingsPath = join(profilePath, 'settings.json');
	if (pathExistsSync(settingsPath)) {
		try {
			const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
			if (settings && settings.startMinimized === true && settings.showTrayIcon === true) {
				return false;
			}
		} catch (_e) {
			// Ignore — show splash on any parse error
		}
	}
	return true;
}
