import { EditorView, ViewPlugin } from '@codemirror/view';

interface OnKeyUpEvent {
	domEvent: KeyboardEvent;
	view: EditorView;
	// true if other keys were pressed (and possibly released) during the time
	// that this key was down (and before it was released).
	otherKeysWerePressed: boolean;
}

// Should return true if the event was handled
type OnKeyUpHandler = (event: OnKeyUpEvent)=> boolean;
// Should return true if the given event matches the key that should
// be handled by the extension:
type IsTargetKeyCallback = (event: KeyboardEvent)=> boolean;

// CodeMirror's built-in keyboard event handlers trigger on key down, rather than on
// key up. In some cases, it's useful to trigger keyboard shortcuts on key up instead.
// For example, if a shortcut should only activate if it isn't pressed at the same time
// as other keys.
const keyUpHandlerExtension = (isTargetKey: IsTargetKeyCallback, onKeyUp: OnKeyUpHandler) => {
	return ViewPlugin.fromClass(class {
		private otherKeysWerePressed = false;
		private targetKeyDown = false;

		public constructor(private view: EditorView) {
			view.contentDOM.addEventListener('keydown', this.onKeyDown);
			view.contentDOM.addEventListener('keyup', this.onKeyUp);
		}

		public destroy() {
			this.view?.contentDOM?.removeEventListener('keyup', this.onKeyUp);
		}

		private onKeyDown = (event: KeyboardEvent) => {
			if (isTargetKey(event)) {
				this.targetKeyDown = true;
			} else if (this.targetKeyDown) {
				this.otherKeysWerePressed = true;
			}
		};

		private onKeyUp = (event: KeyboardEvent) => {
			if (isTargetKey(event)) {
				if (this.targetKeyDown && !event.defaultPrevented) {
					const handled = onKeyUp({
						domEvent: event,
						view: this.view,
						otherKeysWerePressed: this.otherKeysWerePressed,
					});

					if (handled) {
						event.preventDefault();
					}
				}

				this.targetKeyDown = false;
				this.otherKeysWerePressed = false;
			} else if (this.targetKeyDown) {
				this.otherKeysWerePressed = true;
			}
		};
	});
};

export default keyUpHandlerExtension;
