import CommandService from '../CommandService';

// Editor commands will focus the editor after they're executed
export function isEditorCommand(commandName: string) {
	return (commandName.indexOf('editor.') === 0 ||
        // These commands are grandfathered in, but in the future
        // all editor commands should start with "editor."
        // WARNING: Some commands such as textLink are not defined here
        // because they are more complex and handle focus manually
        commandName === 'textCopy' ||
        commandName === 'textCut' ||
        commandName === 'textPaste' ||
        commandName === 'textSelectAll' ||
        commandName === 'textBold' ||
        commandName === 'textItalic' ||
        commandName === 'textCode' ||
        commandName === 'attachFile' ||
        commandName === 'textNumberedList' ||
        commandName === 'textBulletedList' ||
        commandName === 'textCheckbox' ||
        commandName === 'textHeading' ||
        commandName === 'textHorizontalRule' ||
        commandName === 'insertDateTime'
	);
}

export function focusEditorIfEditorCommand(commandName: string, commandService: CommandService): void {
	if (isEditorCommand(commandName)) {
		void commandService.execute('editor.focus');
	}
}
