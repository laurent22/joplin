import Logger from './Logger';
const logger = Logger.create('platformUtil');

const platformUtil = {
	isNode: () => {
		if (typeof process === 'undefined') return false;
		if (platformUtil.isElectron()) return true;
		return process.title === 'node' || (process.title && process.title.indexOf('gulp') === 0);
	},

	isLinux: () => {
		return process && process.platform === 'linux';
	},

	isGNOME: () => {
		// XDG_CURRENT_DESKTOP may be something like "ubuntu:GNOME" and not just "GNOME".
		// Thus, we use .includes and not ===.
		return (platformUtil.isLinux() || platformUtil.isFreeBSD())
			&& process && (process.env['XDG_CURRENT_DESKTOP'] ?? '').includes('GNOME');
	},

	isFreeBSD: () => {
		return process && process.platform === 'freebsd';
	},

	isWindows: () => {
		return process && process.platform === 'win32';
	},

	isMac: () => {
		return process && process.platform === 'darwin';
	},

	platformName: () => {
		if (platformUtil.mobilePlatform() !== '') return platformUtil.mobilePlatform();
		if (platformUtil.isMac()) return 'darwin';
		if (platformUtil.isWindows()) return 'win32';
		if (platformUtil.isLinux()) return 'linux';
		if (platformUtil.isFreeBSD()) return 'freebsd';
		if (process && process.platform) return process.platform;
		throw new Error('Cannot determine platform');
	},
	// "ios" or "android", or "" if not on mobile
	mobilePlatform: () => {
		return ''; // Default if we're not on mobile (React Native)
	},

	// https://github.com/cheton/is-electron
	isElectron: () => {
		// Renderer process
		if (typeof window !== 'undefined' && typeof window.process === 'object' && (window.process as any).type === 'renderer') {
			return true;
		}

		// Main process
		if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!(process.versions as any).electron) {
			return true;
		}

		// Detect the user agent when the `nodeIntegration` option is set to true
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
			return true;
		}

		return false;
	},

	isPortable: (): boolean => {
		return typeof process !== 'undefined' && typeof process.env === 'object' && !!process.env.PORTABLE_EXECUTABLE_DIR;
	},

	isDesktop: () => {
		const platformName = platformUtil.platformName();
		logger.info(`isDesktop platformName:${platformName}`);
		if (!platformName) {
			return false;
		}
		return ['darwin', 'linux', 'freebsd', 'win32'].includes(platformName);
	},

	isMobile: () => {
		const platformName = platformUtil.platformName();
		logger.info(`isMobile platformName:${platformName}`);
		if (!platformName) {
			return false;
		}
		return ['ios', 'android'].includes(platformName);
	},
};

export default platformUtil;
