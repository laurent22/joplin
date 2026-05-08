import { EditorView } from 'prosemirror-view';
import { EditorEvent, EditorEventType } from '../../events';
import { redoDepth, undoDepth } from 'prosemirror-history';

// Syncs the undo stack depth with the main Joplin application
export default class UndoStackSynchronizer {
	private lastUndoDepth_ = 0;
	private lastRedoDepth_ = 0;
	private schedulePostUndoRedoDepthChangeId_: ReturnType<typeof setTimeout>|null = null;

	public constructor(private dispatchEditorEvent_: (event: EditorEvent)=> void) {}

	public schedulePostUndoRedoDepthChange(editor: EditorView, doItNow = false) {
		if (this.schedulePostUndoRedoDepthChangeId_ !== null) {
			if (doItNow) {
				clearTimeout(this.schedulePostUndoRedoDepthChangeId_);
			} else {
				return;
			}
		}

		this.schedulePostUndoRedoDepthChangeId_ = setTimeout(() => {
			this.schedulePostUndoRedoDepthChangeId_ = null;
			const newUndoDepth = undoDepth(editor.state);
			const newRedoDepth = redoDepth(editor.state);

			if (newUndoDepth !== this.lastUndoDepth_ || newRedoDepth !== this.lastRedoDepth_) {
				this.dispatchEditorEvent_({
					kind: EditorEventType.UndoRedoDepthChange,
					undoDepth: newUndoDepth,
					redoDepth: newRedoDepth,
				});
				this.lastUndoDepth_ = newUndoDepth;
				this.lastRedoDepth_ = newRedoDepth;
			}
		}, doItNow ? 0 : 1000);
	}
}
