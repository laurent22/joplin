import CommandService from '../CommandService';
import isEditorCommand from './isEditorCommand';

export default async function focusEditorIfEditorCommand(commandName: string, commandService: CommandService) {
	if (isEditorCommand(commandName)) {
		await commandService.execute('editor.focus');
	}
}
