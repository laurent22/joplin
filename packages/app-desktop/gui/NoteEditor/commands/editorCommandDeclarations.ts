import { CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

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
		focusAfterPress: true,
	},
	{
		name: 'textItalic',
		label: () => _('Italic'),
		iconName: 'icon-italic',
		focusAfterPress: true,
	},
	{
		name: 'textLink',
		label: () => _('Hyperlink'),
		iconName: 'icon-link',
		focusAfterPress: true,
	},
	{
		name: 'textCode',
		label: () => _('Code'),
		iconName: 'icon-code',
		focusAfterPress: true,
	},
	{
		name: 'attachFile',
		label: () => _('Attach file'),
		iconName: 'icon-attachment',
		focusAfterPress: true,
	},
	{
		name: 'textNumberedList',
		label: () => _('Numbered List'),
		iconName: 'icon-numbered-list',
		focusAfterPress: true,
	},
	{
		name: 'textBulletedList',
		label: () => _('Bulleted List'),
		iconName: 'icon-bulleted-list',
		focusAfterPress: true,
	},
	{
		name: 'textCheckbox',
		label: () => _('Checkbox'),
		iconName: 'icon-to-do-list',
		focusAfterPress: true,
	},
	{
		name: 'textHeading',
		label: () => _('Heading'),
		iconName: 'icon-heading',
		focusAfterPress: true,
	},
	{
		name: 'textHorizontalRule',
		label: () => _('Horizontal Rule'),
		iconName: 'fas fa-ellipsis-h',
		focusAfterPress: true,
	},
	{
		name: 'insertDateTime',
		label: () => _('Insert Date Time'),
		iconName: 'icon-add-date',
		focusAfterPress: true,
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
];

export default declarations;
