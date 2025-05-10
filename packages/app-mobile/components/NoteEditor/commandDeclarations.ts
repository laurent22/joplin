import { EditorCommandType } from '@joplin/editor/types';
import { _ } from '@joplin/lib/locale';
import { CommandDeclaration } from '@joplin/lib/services/CommandService';

export const enabledCondition = (_commandName: string) => {
	const output = [
		'!noteIsReadOnly',
	];

	return output.filter(c => !!c).join(' && ');
};

const headerDeclarations = () => {
	const result: CommandDeclaration[] = [];
	for (let level = 1; level <= 5; level++) {
		result.push({
			name: `editor.textHeading${level}`,
			iconName: `material format-header-${level}`,
			label: () => _('Header %d', level),
		});
	}

	return result;
};

const declarations: CommandDeclaration[] = [
	{
		name: 'insertText',
	},
	{
		name: 'editor.undo',
	},
	{
		name: 'editor.redo',
	},
	{
		name: 'selectedText',
	},
	{
		name: 'replaceSelection',
	},
	{
		name: 'editor.setText',
	},
	{
		name: 'editor.focus',
	},
	{
		name: 'editor.execCommand',
	},

	{
		name: EditorCommandType.ToggleBolded,
		label: () => _('Bold'),
		iconName: 'material format-bold',
	},
	{
		name: EditorCommandType.ToggleItalicized,
		label: () => _('Italic'),
		iconName: 'material format-italic',
	},
	...headerDeclarations(),
	{
		name: EditorCommandType.ToggleCode,
		label: () => _('Code'),
		iconName: 'material code-json',
	},
	{
		// The 'editor.' prefix needs to be included because ToggleMath is not a legacy
		// editor command. Without this, ToggleMath is not recognised as an editor command.
		name: `editor.${EditorCommandType.ToggleMath}`,
		label: () => _('Math'),
		iconName: 'material sigma',
	},
	{
		name: EditorCommandType.ToggleNumberedList,
		label: () => _('Ordered list'),
		iconName: 'material format-list-numbered',
	},
	{
		name: EditorCommandType.ToggleBulletedList,
		label: () => _('Unordered list'),
		iconName: 'material format-list-bulleted',
	},
	{
		name: EditorCommandType.ToggleCheckList,
		label: () => _('Task list'),
		iconName: 'material format-list-checks',
	},
	{
		name: EditorCommandType.IndentLess,
		label: () => _('Decrease indent level'),
		iconName: 'ant indent-left',
	},
	{
		name: EditorCommandType.IndentMore,
		label: () => _('Increase indent level'),
		iconName: 'ant indent-right',
	},
	{
		name: `editor.${EditorCommandType.SwapLineDown}`,
		label: () => _('Swap line down'),
		iconName: 'material chevron-double-down',
	},
	{
		name: `editor.${EditorCommandType.SwapLineUp}`,
		label: () => _('Swap line up'),
		iconName: 'material chevron-double-up',
	},
	{
		name: EditorCommandType.ToggleSearch,
		label: () => _('Search'),
		iconName: 'material magnify',
	},
	{
		name: EditorCommandType.EditLink,
		label: () => _('Link'),
		iconName: 'material link',
	},
];

export default declarations;
