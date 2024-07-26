import { CommandDeclaration } from '@joplin/lib/services/CommandService';

export const enabledCondition = (_commandName: string) => {
	const output = [
		'!modalDialogVisible',
		'!noteIsReadOnly',
	];

	return output.filter(c => !!c).join(' && ');
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
];

export default declarations;
