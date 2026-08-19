import type { Editor } from 'tinymce';

// eslint-disable-next-line import/prefer-default-export
export enum TinyMceEditorEvents {
	KeyUp = 'keyup',
	KeyDown = 'keydown',
	KeyPress = 'keypress',
	Paste = 'paste',
	PasteAsText = 'pasteAsText',
	Copy = 'copy',
	CompositionEnd = 'compositionend',
	Cut = 'cut',
	JoplinChange = 'joplinChange',
	Undo = 'Undo',
	Redo = 'Redo',
	ExecCommand = 'ExecCommand',
	SetAttrib = 'SetAttrib',
}

export type DispatchDidUpdateCallback = (editor: Editor)=> void;
