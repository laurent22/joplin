import Logger, { LogLevel } from '@joplin/utils/Logger';
import JoplinError from '../JoplinError';
import { _ } from '../locale';
import Setting from '../models/Setting';
import Note from '../models/Note';

export interface MatchedStartFlags {
	profileDir?: string;
	welcomeDisabled?: boolean;
	env?: string;
	isSafeMode?: boolean;
	showStackTraces?: boolean;
	logLevel?: LogLevel;
	allowOverridingDnsResultOrder?: boolean;
	devPlugins?: string[];
}

// Handles the initial flags passed to main script and
// returns the remaining args.
const processStartFlags = async (argv: string[], setDefaults = true) => {
	const matched: MatchedStartFlags = {};
	argv = argv.slice(0);
	argv.splice(0, 2); // First arguments are the node executable, and the node JS file

	while (argv.length) {
		const arg = argv[0];
		const nextArg = argv.length >= 2 ? argv[1] : null;

		if (arg === '--profile') {
			if (!nextArg) throw new JoplinError(_('Usage: %s', '--profile <dir-path>'), 'flagError');
			matched.profileDir = nextArg;
			argv.splice(0, 2);
			continue;
		}

		if (arg === '--no-welcome') {
			matched.welcomeDisabled = true;
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--env') {
			if (!nextArg) throw new JoplinError(_('Usage: %s', '--env <dev|prod>'), 'flagError');
			matched.env = nextArg;
			argv.splice(0, 2);
			continue;
		}

		if (arg === '--is-demo') {
			Setting.setConstant('isDemo', true);
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--safe-mode') {
			matched.isSafeMode = true;
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--open-dev-tools') {
			Setting.setConstant('flagOpenDevTools', true);
			argv.splice(0, 1);
			continue;
		}

		if (arg.startsWith('--dns-result-order=')) {
			matched.allowOverridingDnsResultOrder = false;

			// Handled by Electron/NodeJS (and indicates we shouldn't override this ourselves).
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--debug') {
			// Currently only handled by ElectronAppWrapper (isDebugMode property)
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--update-geolocation-disabled') {
			Note.updateGeolocationEnabled_ = false;
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--stack-trace-enabled') {
			matched.showStackTraces = true;
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--log-level') {
			if (!nextArg) throw new JoplinError(_('Usage: %s', '--log-level <none|error|warn|info|debug>'), 'flagError');
			matched.logLevel = Logger.levelStringToId(nextArg);
			argv.splice(0, 2);
			continue;
		}

		if (arg.indexOf('-psn') === 0) {
			// Some weird flag passed by macOS - can be ignored.
			// https://github.com/laurent22/joplin/issues/480
			// https://stackoverflow.com/questions/10242115
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--enable-logging') {
			// Electron-specific flag used for debugging - ignore it
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--dev-plugins') {
			matched.devPlugins = nextArg.split(',').map(p => p.trim());
			Setting.setConstant('startupDevPlugins', matched.devPlugins);
			argv.splice(0, 2);
			continue;
		}

		if (arg.indexOf('--remote-debugging-port=') === 0) {
			// Electron-specific flag used for debugging - ignore it. Electron expects this flag in '--x=y' form, a single string.
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--no-sandbox') {
			// Electron-specific flag for running the app without chrome-sandbox
			// Allows users to use it as a workaround for the electron+AppImage issue
			// https://github.com/laurent22/joplin/issues/2246
			argv.splice(0, 1);
			continue;
		}

		if (arg.indexOf('--user-data-dir=') === 0) {
			// Electron-specific flag. Allows users to run the app with chromedriver.
			argv.splice(0, 1);
			continue;
		}

		if (arg.indexOf('--enable-features=') === 0) {
			// Electron-specific flag - ignore it
			// Allows users to run the app on native wayland
			argv.splice(0, 1);
			continue;
		}

		if (arg.indexOf('--enable-wayland-ime') === 0) {
			// Electron-specific flag - ignore it
			// Enables input method support on Linux/Wayland
			// See https://github.com/laurent22/joplin/issues/10345
			argv.splice(0, 1);
			continue;
		}

		if (arg.indexOf('--ozone-platform=') === 0) {
			// Electron-specific flag - ignore it
			// Allows users to run the app on native wayland
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--disable-smooth-scrolling') {
			// Electron-specific flag - ignore it
			// Allows users to disable smooth scrolling
			argv.splice(0, 1);
			continue;
		}

		if (arg === '--disable-gpu') {
			// Electron-specific flag - ignore it
			// Allows users to disable GPU acceleration
			argv.splice(0, 1);
			continue;
		}

		if (arg.length && arg[0] === '-') {
			throw new JoplinError(_('Unknown flag: %s', arg), 'flagError');
		} else {
			break;
		}
	}

	if (setDefaults) {
		if (!matched.logLevel) matched.logLevel = Logger.LEVEL_INFO;
		if (!matched.env) matched.env = 'prod';
		if (!matched.devPlugins) matched.devPlugins = [];
		matched.allowOverridingDnsResultOrder ??= true;
	}

	return {
		matched: matched,
		argv: argv,
	};
};

export default processStartFlags;
