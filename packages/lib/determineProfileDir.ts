import { homedir } from 'os';
import { toSystemSlashes } from './path-utils';

export default (profileFromArgs: string, appName: string) => {
	let output = '';

	if (profileFromArgs) {
		output = profileFromArgs;
	} else if (process && process.env && process.env.PORTABLE_EXECUTABLE_DIR) {
		output = `${process.env.PORTABLE_EXECUTABLE_DIR}/JoplinProfile`;
	} else {
		output = `${homedir()}/.config/${appName}`;
	}

	return toSystemSlashes(output, 'linux');
};
