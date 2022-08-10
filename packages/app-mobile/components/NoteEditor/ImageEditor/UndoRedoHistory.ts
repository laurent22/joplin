import SVGEditor from './SVGEditor';
import Command from './commands/Command';


class UndoRedoHistory {
	private undoStack: Command[];
	private redoStack: Command[];

	public constructor(private readonly editor: SVGEditor) {
		this.undoStack = [];
		this.redoStack = [];
	}

	/**
	 * Adds the given command to this and applies it to the editor.
	 */
	public push(command: Command, apply: boolean = true) {
		if (apply) {
			command.apply(this.editor);
		}
		this.undoStack.push(command);
		this.redoStack = [];
	}

	/**
	 * Remove the last command from this' undo stack and apply it.
	 */
	public undo() {
		const command = this.undoStack.pop();
		if (command) {
			this.redoStack.push(command);
			command.unapply(this.editor);
		}
	}

	public redo() {
		const command = this.redoStack.pop();
		if (command) {
			this.undoStack.push(command);
			command.apply(this.editor);
		}
	}
}

export default UndoRedoHistory;
