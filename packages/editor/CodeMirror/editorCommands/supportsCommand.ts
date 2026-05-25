

// The CodeMirror 6 editor supports all EditorCommandTypes.
// Note that this file is separate from editorCommands.ts to allow importing it in
// non-browser contexts.
import { EditorCommandType } from '../../types';
const supportsCommand = (commandName: EditorCommandType) => {
	return Object.values(EditorCommandType).includes(commandName);
};

export default supportsCommand;
