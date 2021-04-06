// Editor commands will focus the editor after they're executed
export default function isEditorCommand(commandName: string) {
	if (!commandName) return false;

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
