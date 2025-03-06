import { CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { joplinCommandToTinyMceCommands } from './NoteBody/TinyMCE/utils/joplinCommandToTinyMceCommands';

const workWithHtmlNotes = [
	'attachFile',
];

export const enabledCondition = (commandName: string) => {
	const markdownEditorOnly = !Object.keys(joplinCommandToTinyMceCommands).includes(commandName);
	const noteMustBeMarkdown = !workWithHtmlNotes.includes(commandName);

	const output = [
		// gotoAnythingVisible: Enable if the command palette (which is a modal dialog) is visible
		'(!modalDialogVisible || gotoAnythingVisible)',

		markdownEditorOnly ? 'markdownEditorPaneVisible' : '(markdownEditorPaneVisible || richTextEditorVisible)',
		'oneNoteSelected',
		noteMustBeMarkdown ? 'noteIsMarkdown' : '',
		'!noteIsReadOnly',
	];

	return output.filter(c => !!c).join(' && ');
};

const declarations: CommandDeclaration[] = [
	{
		name: 'insertText',
	},
	{
		name: 'scrollToHash',
	},
	{
		name: 'textCopy',
		label: () => _('Copy'),
		role: 'copy',
	},
	{
		name: 'textCut',
		label: () => _('Cut'),
		role: 'cut',
	},
	{
		name: 'textPaste',
		label: () => _('Paste'),
		role: 'paste',
	},
	{
		name: 'textSelectAll',
		label: () => _('Select all'),
		role: 'selectAll',
	},
	{
		name: 'textBold',
		label: () => _('Bold'),
		iconName: 'icon-bold',
	},
	{
		name: 'textItalic',
		label: () => _('Italic'),
		iconName: 'icon-italic',
	},
	{
		name: 'textLink',
		label: () => _('Hyperlink'),
		iconName: 'icon-link',
	},
	{
		name: 'textCode',
		label: () => _('Code'),
		iconName: 'icon-code',
	},
	{
		name: 'attachFile',
		label: () => _('Attach file'),
		iconName: 'icon-attachment',
	},
	{
		name: 'textNumberedList',
		label: () => _('Numbered List'),
		iconName: 'icon-numbered-list',
	},
	{
		name: 'textBulletedList',
		label: () => _('Bulleted List'),
		iconName: 'icon-bulleted-list',
	},
	{
		name: 'textCheckbox',
		label: () => _('Checkbox'),
		iconName: 'icon-to-do-list',
	},
	{
		name: 'textHeading',
		label: () => _('Heading'),
		iconName: 'icon-heading',
	},
	{
		name: 'textHorizontalRule',
		label: () => _('Horizontal Rule'),
		iconName: 'fas fa-ellipsis-h',
	},
	{
		name: 'insertDateTime',
		label: () => _('Insert time'),
		iconName: 'icon-add-date',
	},
	{
		name: 'editor.deleteLine',
		label: () => _('Delete line'),
	},
	{
		name: 'editor.duplicateLine',
		label: () => _('Duplicate line'),
	},
	{
		name: 'editor.undo',
		label: () => _('Editor: %s', _('Undo')),
	},
	{
		name: 'editor.redo',
		label: () => _('Editor: %s', _('Redo')),
	},
	{
		name: 'editor.indentLess',
		label: () => _('Indent less'),
	},
	{
		name: 'editor.indentMore',
		label: () => _('Indent more'),
	},
	{
		name: 'editor.toggleComment',
		label: () => _('Toggle comment'),
	},
	{
		name: 'editor.sortSelectedLines',
		label: () => _('Sort selected lines'),
	},
	{
		name: 'editor.swapLineUp',
		label: () => _('Swap line up'),
	},
	{
		name: 'editor.swapLineDown',
		label: () => _('Swap line down'),
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
		name: 'editor.scrollToText',
	},
	{
		name: 'editor.focus',
	},
	{
		name: 'editor.execCommand',
	},
];

export default declarations;
