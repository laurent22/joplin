// This is the basic initialization for the Electron MAIN process

const electronApp = require('electron').app;
require('@electron/remote/main').initialize();
const ElectronAppWrapper = require('./ElectronAppWrapper').default;
const { initBridge } = require('./bridge');
const Logger = require('@joplin/utils/Logger').default;
const FsDriverNode = require('@joplin/lib/fs-driver-node').default;
const envFromArgs = require('@joplin/lib/envFromArgs');
const packageInfo = require('./packageInfo.js');
const { isCallbackUrl } = require('@joplin/lib/callbackUrlUtils');

// Electron takes the application name from package.json `name` and
// displays this in the tray icon toolip and message box titles, however in
// our case it's a string like "@joplin/app-desktop". It's also supposed to
// check the productName key but is not doing it, so here set the
// application name to the right string.
electronApp.name = packageInfo.name;

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
	process.exit(1);
});

// Likewise, we want to know if a profile is specified early, in particular
// to save the window state data.
function profileFromArgs(args) {
	if (!args) return null;
	const profileIndex = args.indexOf('--profile');
	if (profileIndex <= 0 || profileIndex >= args.length - 1) return null;
	const profileValue = args[profileIndex + 1];
	return profileValue ? profileValue : null;
}

Logger.fsDriver_ = new FsDriverNode();

const env = envFromArgs(process.argv);
const profilePath = profileFromArgs(process.argv);
const isDebugMode = !!process.argv && process.argv.indexOf('--debug') >= 0;

electronApp.setAsDefaultProtocolClient('joplin');

const initialCallbackUrl = process.argv.find((arg) => isCallbackUrl(arg));

const wrapper = new ElectronAppWrapper(electronApp, env, profilePath, isDebugMode, initialCallbackUrl);

initBridge(wrapper);

wrapper.start().catch((error) => {
	console.error('Electron App fatal error:');
	console.error(error);
});
