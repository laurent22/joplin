import { AppState } from '../../../utils/types';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { EditorCommandType } from '@joplin/editor/types';

const builtInCommandNames = [
	'attachFile',
	'-',
	'editor.textHeading1',
	'editor.textHeading2',
	'editor.textHeading3',
	'editor.textHeading4',
	'editor.textHeading5',
	EditorCommandType.ToggleBolded,
	EditorCommandType.ToggleItalicized,
	'-',
	EditorCommandType.ToggleCode,
	`editor.${EditorCommandType.ToggleMath}`,
	'-',
	EditorCommandType.ToggleNumberedList,
	EditorCommandType.ToggleBulletedList,
	EditorCommandType.ToggleCheckList,
	'-',
	EditorCommandType.IndentLess,
	EditorCommandType.IndentMore,
	'-',
	'insertDateTime',
	'-',
	EditorCommandType.EditLink,
	'setTags',
	EditorCommandType.ToggleSearch,
	'hideKeyboard',
];


const allToolbarCommandNamesFromState = (state: AppState) => {
	const pluginCommandNames = pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'editorToolbar');

	let allCommandNames = builtInCommandNames;
	if (pluginCommandNames.length > 0) {
		allCommandNames = allCommandNames.concat(['-'], pluginCommandNames);
	}

	// If the user disables math markup, the "toggle math" button won't be useful.
	// Disabling the math markup button maintains compatibility with the previous
	// toolbar.
	const mathEnabled = state.settings['markdown.plugin.katex'];
	if (!mathEnabled) {
		allCommandNames = allCommandNames.filter(
			name => name !== `editor.${EditorCommandType.ToggleMath}`,
		);
	}

	return allCommandNames;
};

export default allToolbarCommandNamesFromState;
