import { homedir } from 'os';
import { toSystemSlashes } from './path-utils';

export default (profileFromArgs: string, appName: string) => {
	let profileDir = '';
	let homeDir = '';

	if (profileFromArgs) {
		profileDir = profileFromArgs;
		homeDir = profileDir;
	} else if (process && process.env && process.env.PORTABLE_EXECUTABLE_DIR) {
		profileDir = `${process.env.PORTABLE_EXECUTABLE_DIR}/JoplinProfile`;
		homeDir = process.env.PORTABLE_EXECUTABLE_DIR;
	} else {
		profileDir = `${homedir()}/.config/${appName}`;
		homeDir = homedir();
	}

	return {
		rootProfileDir: toSystemSlashes(profileDir, 'linux'),
		homeDir: toSystemSlashes(homeDir, 'linux'),
	};
};
