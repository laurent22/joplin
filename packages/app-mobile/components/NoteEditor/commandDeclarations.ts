import { EditorCommandType } from '@joplin/editor/types';
import { _ } from '@joplin/lib/locale';
import { CommandDeclaration } from '@joplin/lib/services/CommandService';

const markdownEditorOnlyCommands = [
	EditorCommandType.DuplicateLine,
	EditorCommandType.SortSelectedLines,
	EditorCommandType.SwapLineUp,
	EditorCommandType.SwapLineDown,
].map(command => `editor.${command}`);



const richTextEditorOnlyCommands = [
	EditorCommandType.InsertTable,
	EditorCommandType.InsertCodeBlock,
].map(command => `editor.${command}`);

export const visibleCondition = (commandName: string) => {
	const output = [];

	if (markdownEditorOnlyCommands.includes(commandName)) {
		output.push('!richTextEditorVisible');
	}

	if (richTextEditorOnlyCommands.includes(commandName)) {
		output.push('!markdownEditorPaneVisible');
	}

	return output.join(' && ');
};

export const enabledCondition = (commandName: string) => {
	return [
		visibleCondition(commandName), '!noteIsReadOnly',
	].filter(c => !!c).join('&&');
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
		name: `editor.${EditorCommandType.InsertTable}`,
		label: () => _('Table'),
		iconName: 'material table',
	},
	{
		name: `editor.${EditorCommandType.InsertCodeBlock}`,
		label: () => _('Block code'),
		iconName: 'material code-tags',
	},
	{
		name: EditorCommandType.IndentLess,
		label: () => _('Decrease indent level'),
		iconName: 'material format-indent-decrease',
	},
	{
		name: EditorCommandType.IndentMore,
		label: () => _('Increase indent level'),
		iconName: 'material format-indent-increase',
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
		name: `editor.${EditorCommandType.DeleteLine}`,
		label: () => _('Delete line'),
		iconName: 'material close',
	},
	{
		name: `editor.${EditorCommandType.DuplicateLine}`,
		label: () => _('Duplicate line'),
		iconName: 'material content-duplicate',
	},
	{
		name: `editor.${EditorCommandType.SortSelectedLines}`,
		label: () => _('Sort selected lines'),
		iconName: 'material sort-alphabetical-ascending',
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
