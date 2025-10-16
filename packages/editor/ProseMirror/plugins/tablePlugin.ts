import { addColumnAfter, addRowAfter, deleteColumn, deleteRow, tableEditing } from 'prosemirror-tables';
import createFloatingButtonPlugin, { ToolbarType } from './utils/createFloatingButtonPlugin';
import addColumnRightIcon from '../vendor/icons/addColumnRight';
import addRowBelowIcon from '../vendor/icons/addRowBelow';
import removeRowIcon from '../vendor/icons/removeRow';
import removeColumnIcon from '../vendor/icons/removeColumn';
import focusEditor from '../commands/focusEditor';
import { Command } from 'prosemirror-state';

const tableCommand = (command: Command): Command => (state, dispatch, view) => {
	return command(state, dispatch, view) && focusEditor(state, dispatch, view);
};

const tablePlugin = [
	tableEditing({ allowTableNodeSelection: true }),
	createFloatingButtonPlugin('table', [
		{
			icon: addRowBelowIcon,
			label: (_) => _('Add row'),
			command: () => tableCommand(addRowAfter),
		},
		{
			icon: addColumnRightIcon,
			label: (_) => _('Add column'),
			command: () => tableCommand(addColumnAfter),
		},
		{
			icon: removeRowIcon,
			label: (_) => _('Delete row'),
			command: () => tableCommand(deleteRow),
		},
		{
			icon: removeColumnIcon,
			label: (_) => _('Delete column'),
			command: () => tableCommand(deleteColumn),
		},
	], ToolbarType.FloatAboveBelow),
];

export default tablePlugin;
