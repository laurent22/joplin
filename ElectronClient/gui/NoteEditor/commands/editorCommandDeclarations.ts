import { CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

const declarations:CommandDeclaration[] = [
	{
		name: 'insertText',
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
		iconName: 'fa-bold',
	},
	{
		name: 'textItalic',
		label: () => _('Italic'),
		iconName: 'fa-italic',
	},
	{
		name: 'textLink',
		label: () => _('Hyperlink'),
		iconName: 'fa-link',
	},
	{
		name: 'textCode',
		label: () => _('Code'),
		iconName: 'fa-code',
	},
	{
		name: 'attachFile',
		label: () => _('Attach file'),
		iconName: 'fa-paperclip',
	},
	{
		name: 'textNumberedList',
		label: () => _('Numbered List'),
		iconName: 'fa-list-ol',
	},
	{
		name: 'textBulletedList',
		label: () => _('Bulleted List'),
		iconName: 'fa-list-ul',
	},
	{
		name: 'textCheckbox',
		label: () => _('Checkbox'),
		iconName: 'fa-check-square',
	},
	{
		name: 'textHeading',
		label: () => _('Heading'),
		iconName: 'fa-heading',
	},
	{
		name: 'textHorizontalRule',
		label: () => _('Horizontal Rule'),
		iconName: 'fa-ellipsis-h',
	},
	{
		name: 'insertDateTime',
		label: () => _('Insert Date Time'),
		iconName: 'fa-calendar-plus',
	},
];

export default declarations;
