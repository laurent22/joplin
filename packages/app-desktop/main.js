// This is the basic initialization for the Electron MAIN process

const electronApp = require('electron').app;
require('@electron/remote/main').initialize();
const ElectronAppWrapper = require('./ElectronAppWrapper').default;
const { pathExistsSync, readFileSync } = require('fs-extra');
const { initBridge } = require('./bridge');
const Logger = require('@joplin/utils/Logger').default;
const FsDriverNode = require('@joplin/lib/fs-driver-node').default;
const envFromArgs = require('@joplin/lib/envFromArgs');
const packageInfo = require('./packageInfo.js');
const { isCallbackUrl } = require('@joplin/lib/callbackUrlUtils');
const determineBaseAppDirs = require('@joplin/lib/determineBaseAppDirs').default;
const registerCustomProtocols = require('./utils/customProtocols/registerCustomProtocols.js').default;

// Electron takes the application name from package.json `name` and
// displays this in the tray icon toolip and message box titles, however in
// our case it's a string like "@joplin/app-desktop". It's also supposed to
// check the productName key but is not doing it, so here set the
// application name to the right string.
electronApp.setName(packageInfo.name);

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
	process.exit(1);
});

// Likewise, we want to know if a profile is specified early, in particular
// to save the window state data.
function getProfileFromArgs(args) {
	if (!args) return null;
	const profileIndex = args.indexOf('--profile');
	if (profileIndex <= 0 || profileIndex >= args.length - 1) return null;
	const profileValue = args[profileIndex + 1];
	return profileValue ? profileValue : null;
}

Logger.fsDriver_ = new FsDriverNode();

const env = envFromArgs(process.argv);
const profileFromArgs = getProfileFromArgs(process.argv);
const isDebugMode = !!process.argv && process.argv.indexOf('--debug') >= 0;

// We initialize all these variables here because they are needed from the main process. They are
// then passed to the renderer process via the bridge.
const appId = `net.cozic.joplin${env === 'dev' ? 'dev' : ''}-desktop`;
let appName = env === 'dev' ? 'joplindev' : 'joplin';
if (appId.indexOf('-desktop') >= 0) appName += '-desktop';
const { rootProfileDir } = determineBaseAppDirs(profileFromArgs, appName);
const settingsPath = `${rootProfileDir}/settings.json`;
let autoUploadCrashDumps = false;

if (pathExistsSync(settingsPath)) {
	const settingsContent = readFileSync(settingsPath, 'utf8');
	try {
		const settings = JSON.parse(settingsContent);
		autoUploadCrashDumps = !!settings && !!settings.autoUploadCrashDumps;
	} catch (error) {
		console.error(`Could not load settings: ${settingsPath}:`, error);
	}
}

electronApp.setAsDefaultProtocolClient('joplin');
void registerCustomProtocols();

const initialCallbackUrl = process.argv.find((arg) => isCallbackUrl(arg));

const wrapper = new ElectronAppWrapper(electronApp, env, rootProfileDir, isDebugMode, initialCallbackUrl);

initBridge(wrapper, appId, appName, rootProfileDir, autoUploadCrashDumps);

wrapper.start().catch((error) => {
	console.error('Electron App fatal error:');
	console.error(error);
});
