import Logger from '@joplin/utils/Logger';
// import smallshim from '@joplin/lib/smallshim';
// const smallshim = require('@joplin/lib/smallshim').default;

const logger = Logger.create('table_open');

const smallshim = {
	isNode: () => {
		if (typeof process === 'undefined') return false;
		if (smallshim.isElectron()) return true;
		return process.title === 'node' || (process.title && process.title.indexOf('gulp') === 0);
	},

	isReactNative: () => {
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('ReactNativeDebugger') >= 0) {
			return true;
		}

		return !smallshim.isNode();
	},

	isLinux: () => {
		return process && process.platform === 'linux';
	},

	isGNOME: () => {
		// XDG_CURRENT_DESKTOP may be something like "ubuntu:GNOME" and not just "GNOME".
		// Thus, we use .includes and not ===.
		return (smallshim.isLinux() || smallshim.isFreeBSD())
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
		if (smallshim.isReactNative()) return smallshim.mobilePlatform();
		if (smallshim.isMac()) return 'darwin';
		if (smallshim.isWindows()) return 'win32';
		if (smallshim.isLinux()) return 'linux';
		if (smallshim.isFreeBSD()) return 'freebsd';
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
};

const isDesktop = (platformName?: string) => {
	if (!platformName) {
		return false;
	}

	return ['darwin', 'linux', 'freebsd', 'win32'].includes(platformName);
};

function pluginAssets() {
	logger.info('pluginAssets');
	return isDesktop(smallshim.platformName()) ? [
		{ name: 'jquery.min.js' },
		{ name: 'jquery.ba-floatingscrollbar.js' },
	] : [];
	// return [
	// 	{ name: 'jquery.min.js' },
	// 	{ name: 'jquery.ba-floatingscrollbar.js' },
	// ];
}


function tableOpenPlugin(markdownIt: any) {
	// const precedentRule = markdownIt.renderer.rules['table_open'];

	markdownIt.renderer.rules.table_open = function(tokens: any[], idx: number, options: any, _env: any, self: any) {
		if (tokens[idx].map) {
			const line = tokens[idx].map[0];
			const lineEnd = tokens[idx].map[1];
			tokens[idx].attrJoin('class', 'maps-to-line');
			tokens[idx].attrSet('source-line', `${line}`);
			tokens[idx].attrSet('source-line-end', `${lineEnd}`);
		}
		const cur = String(self.renderToken(tokens, idx, options));
		return `<div class="joplin-table-div">\n${cur}`;
	};
}

export default {
	plugin: tableOpenPlugin,
	assets: pluginAssets,
};
