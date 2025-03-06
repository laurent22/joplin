import { AppState } from '../../../utils/types';
import allToolbarCommandNamesFromState from './allToolbarCommandNamesFromState';
import { Platform } from 'react-native';

const omitFromDefault: string[] = [
	'editor.textHeading1',
	'editor.textHeading3',
	'editor.textHeading4',
	'editor.textHeading5',
];

// The "hide keyboard" button is only needed on iOS, so only show it there by default.
// (There's no default "dismiss" button on iPhone software keyboards).
if (Platform.OS !== 'ios') {
	omitFromDefault.push('hideKeyboard');
}

const selectedCommandNamesFromState = (state: AppState) => {
	const allCommandNames = allToolbarCommandNamesFromState(state);
	const defaultCommandNames = allCommandNames.filter(commandName => {
		return !omitFromDefault.includes(commandName);
	});

	const commandNameSetting = state.settings['editor.toolbarButtons'] ?? [];
	const selectedCommands = commandNameSetting.length > 0 ? commandNameSetting : defaultCommandNames;

	return selectedCommands.filter(command => allCommandNames.includes(command));
};

export default selectedCommandNamesFromState;
