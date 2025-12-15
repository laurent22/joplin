import { addColumnAfter, addRowAfter, deleteColumn, deleteRow, deleteTable, tableEditing } from 'prosemirror-tables';
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

// By default, commands like deleteRow or deleteColumn don't delete the last
// row/column in the table. This command removes the table when there are no more
// rows/columns to delete:
const runCommandOrDeleteTable = (command: Command): Command => (state, dispatch, view) => {
	return command(state, dispatch, view) || deleteTable(state, dispatch);
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
			command: () => tableCommand(runCommandOrDeleteTable(deleteRow)),
		},
		{
			icon: removeColumnIcon,
			label: (_) => _('Delete column'),
			command: () => tableCommand(runCommandOrDeleteTable(deleteColumn)),
		},
	], ToolbarType.FloatAboveBelow),
];

export default tablePlugin;
