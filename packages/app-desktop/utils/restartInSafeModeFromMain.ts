import Setting, { AppType } from '@joplin/lib/models/Setting';
import bridge from '../bridge';
import processStartFlags from '@joplin/lib/utils/processStartFlags';
import { safeModeFlagFilename } from '@joplin/lib/BaseApplication';
import initProfile from '@joplin/lib/services/profileConfig/initProfile';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import determineBaseAppDirs from '@joplin/lib/determineBaseAppDirs';


const restartInSafeModeFromMain = async () => {
	// Only set constants here -- the main process doesn't have easy access (without loading
	// a large amount of other code) to the database.
	const appName = bridge().appName();
	Setting.setConstant('appId', `net.cozic.${appName}`);
	Setting.setConstant('appType', AppType.Desktop);
	Setting.setConstant('appName', appName);

	// Load just enough for us to write a file in the profile directory
	const { shimInit } = require('@joplin/lib/shim-init-node.js');
	shimInit({});

	const startFlags = await processStartFlags(bridge().processArgv());
	const { rootProfileDir } = determineBaseAppDirs(startFlags.matched.profileDir, appName);
	const { profileDir } = await initProfile(rootProfileDir);

	// We can't access the database, so write to a file instead.
	const safeModeFlagFile = join(profileDir, safeModeFlagFilename);
	await writeFile(safeModeFlagFile, 'true', 'utf8');

	bridge().restart();
};

export default restartInSafeModeFromMain;
