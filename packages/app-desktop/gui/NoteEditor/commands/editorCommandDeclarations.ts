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
		label: () => _('Insert Date Time'),
		iconName: 'icon-add-date',
	},
	{
		name: 'editor.deleteLine',
		label: `${_('Delete line')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.undo',
		label: `${_('Undo')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.redo',
		label: `${_('Redo')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goDocStart',
		label: `${_('Go to beginning of note')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goDocEnd',
		label: `${_('Go to end of note')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goGroupLeft',
		label: `${_('Go group left')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goGroupRight',
		label: `${_('Go group right')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goLineStart',
		label: `${_('Go to line start')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.goLineEnd',
		label: `${_('Go to line end')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.delGroupBefore',
		label: `${_('Delete group before')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.delGroupAfter',
		label: `${_('Delete group after')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.indentLess',
		label: `${_('Indent less')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.indentMore',
		label: `${_('Indent more')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.toggleComment',
		label: `${_('Toggle comment')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.sortSelectedLines',
		label: `${_('Sort selected lines')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.swapLineUp',
		label: `${_('Swap line up')} ${_('(wysiwyg: %s)', _('no'))}`,
	},
	{
		name: 'editor.swapLineDown',
		label: `${_('Swap line down')} ${_('(wysiwyg: %s)', _('no'))}`,
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
];

export default declarations;
