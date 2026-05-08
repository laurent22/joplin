// This is the basic initialization for the Electron MAIN process

import './utils/sourceMapSetup';
import { app as electronApp } from 'electron';
require('@electron/remote/main').initialize();
import ElectronAppWrapper from './ElectronAppWrapper';
import { pathExistsSync, readFileSync, mkdirpSync } from 'fs-extra';
import { initBridge } from './bridge';
import Logger from '@joplin/utils/Logger';
import FsDriverNode from '@joplin/lib/fs-driver-node';
const envFromArgs = require('@joplin/lib/envFromArgs');
const packageInfo = require('./packageInfo.js');
import { isCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import determineBaseAppDirs from '@joplin/lib/determineBaseAppDirs';
import registerCustomProtocols from './utils/customProtocols/registerCustomProtocols';

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

const getFlagValueFromArgs = (args: string[], flag: string, defaultValue: string|null) => {
	if (!args) return null;
	const index = args.indexOf(flag);
	if (index <= 0 || index >= args.length - 1) return defaultValue;
	const value = args[index + 1];
	return value ? value : defaultValue;
};

Logger.fsDriver_ = new FsDriverNode();

const env = envFromArgs(process.argv);
const profileFromArgs = getFlagValueFromArgs(process.argv, '--profile', null);
const isDebugMode = !!process.argv && process.argv.indexOf('--debug') >= 0;
const isEndToEndTesting = !!process.argv?.includes('--running-tests');
const altInstanceId = getFlagValueFromArgs(process.argv, '--alt-instance-id', '');

// We initialize all these variables here because they are needed from the main process. They are
// then passed to the renderer process via the bridge.
const appId = `net.cozic.joplin${env === 'dev' ? 'dev' : ''}-desktop`;
let appName = env === 'dev' ? 'joplindev' : 'joplin';
if (appId.indexOf('-desktop') >= 0) appName += '-desktop';
const { rootProfileDir } = determineBaseAppDirs(profileFromArgs, appName, altInstanceId);

// We create the profile dir as soon as we know where it's going to be located since it's used in
// various places early in the initialisation code.
mkdirpSync(rootProfileDir);

// Required for correct display of Windows notifications. Should be done near the beginning of startup. See
// https://www.electron.build/nsis.html#guid-vs-application-name
electronApp.setAppUserModelId(appId);

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

const wrapper = new ElectronAppWrapper(electronApp, {
	env, profilePath: rootProfileDir, isDebugMode, initialCallbackUrl, isEndToEndTesting,
});


type ExtendedGlobal = {
	joplinBridge: unknown;
};
(globalThis as unknown as ExtendedGlobal).joplinBridge = (
	initBridge(wrapper, appId, appName, rootProfileDir, autoUploadCrashDumps, altInstanceId)
);

wrapper.start().catch((error) => {
	console.error('Electron App fatal error:');
	console.error(error);
});
