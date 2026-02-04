import { WindowControl } from '../../utils/useWindowControl';

// CodeMirror and TinyMCE both have trouble with native Electron
// undo/redo.
// See https://github.com/laurent22/joplin/issues/14216
const canUseNativeUndo = (control: WindowControl) => {
	const dom = control.getFocusedDocument();
	return !dom.activeElement.closest('.CodeMirror, div.joplin-tinymce');
};

export default canUseNativeUndo;
