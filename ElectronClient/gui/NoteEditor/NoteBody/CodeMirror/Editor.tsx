import * as React from 'react';
import { useEffect, useImperativeHandle, useState, useRef, useCallback, forwardRef } from 'react';

import * as CodeMirror from 'codemirror';

import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/scrollpastend';

import useListIdent from './utils/useListIdent';
import useScrollUtils from './utils/useScrollUtils';
import useCursorUtils from './utils/useCursorUtils';
import useLineSorting from './utils/useLineSorting';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';
import 'codemirror/keymap/sublime'; // Used for swapLineUp and swapLineDown

import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/xml/xml';
// Modes for syntax highlighting inside of code blocks
import 'codemirror/mode/python/python';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/diff/diff';
import 'codemirror/mode/sql/sql';

export interface CancelledKeys {
	mac: string[],
	default: string[],
}

export interface EditorProps {
	value: string,
	mode: string,
	style: any,
	theme: any,
	readOnly: boolean,
	autoMatchBraces: boolean,
	keyMap: string,
	cancelledKeys: CancelledKeys,
	onChange: any,
	onScroll: any,
	onEditorContextMenu: any,
	onEditorPaste: any,
}

function Editor(props: EditorProps, ref: any) {
	const [editor, setEditor] = useState(null);
	const editorParent = useRef(null);

	// Codemirror plugins add new commands to codemirror (or change it's behavior)
	// This command adds the smartListIndent function which will be bound to tab
	useListIdent(CodeMirror);
	useScrollUtils(CodeMirror);
	useCursorUtils(CodeMirror);
	useLineSorting(CodeMirror);

	useEffect(() => {
		if (props.cancelledKeys) {
			for (let i = 0; i < props.cancelledKeys.mac.length; i++) {
				const k = props.cancelledKeys.mac[i];
				CodeMirror.keyMap.macDefault[k] = null;
			}
			for (let i = 0; i < props.cancelledKeys.default.length; i++) {
				const k = props.cancelledKeys.default[i];
				CodeMirror.keyMap.default[k] = null;
			}
		}
	}, [props.cancelledKeys]);

	useImperativeHandle(ref, () => {
		return editor;
	});

	const editor_change = useCallback((cm: any, change: any) => {
		if (props.onChange && change.origin !== 'setValue') {
			props.onChange(cm.getValue());
		}
	}, [props.onChange]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_scroll = useCallback((_cm: any) => {
		props.onScroll();
	}, [props.onScroll]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_mousedown = useCallback((_cm: any, event: any) => {
		if (event && event.button === 2) {
			props.onEditorContextMenu();
		}
	}, [props.onEditorContextMenu]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_paste = useCallback((_cm: any, _event: any) => {
		props.onEditorPaste();
	}, [props.onEditorPaste]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_drop = useCallback((cm: any, _event: any) => {
		cm.focus();
	}, []);

	const editor_drag = useCallback((cm: any, event: any) => {
		// This is the type for all drag and drops that are external to codemirror
		// setting the cursor allows us to drop them in the right place
		if (event.dataTransfer.effectAllowed === 'all') {
			const coords = cm.coordsChar({ left: event.x, top: event.y });
			cm.setCursor(coords);
		}
	}, []);

	// const divRef = useCallback(node => {
	useEffect(() => {
		if (!editorParent.current) return () => {};

		const cmOptions = {
			value: props.value,
			screenReaderLabel: props.value,
			theme: props.theme,
			mode: props.mode,
			readOnly: props.readOnly,
			autoCloseBrackets: props.autoMatchBraces,
			inputStyle: 'textarea', // contenteditable loses cursor position on focus change, use textarea instead
			lineWrapping: true,
			lineNumbers: false,
			scrollPastEnd: true,
			indentWithTabs: true,
			indentUnit: 4,
			spellcheck: true,
			allowDropFileTypes: [''], // disable codemirror drop handling
			keyMap: props.keyMap ? props.keyMap : 'default',
			extraKeys: { 'Enter': 'insertListElement',
				'Ctrl-/': 'toggleComment',
				'Ctrl-Alt-S': 'sortSelectedLines',
				'Alt-Up': 'swapLineUp',
				'Alt-Down': 'swapLineDown',
				'Cmd-/': 'toggleComment',
				'Cmd-Opt-S': 'sortSelectedLines',
				'Opt-Up': 'swapLineUp',
				'Opt-Down': 'swapLineDown',
				'Tab': 'smartListIndent',
				'Shift-Tab': 'smartListUnindent' },
		};
		const cm = CodeMirror(editorParent.current, cmOptions);
		setEditor(cm);
		cm.on('change', editor_change);
		cm.on('scroll', editor_scroll);
		cm.on('mousedown', editor_mousedown);
		cm.on('paste', editor_paste);
		cm.on('drop', editor_drop);
		cm.on('dragover', editor_drag);

		return () => {
			// Clean up codemirror
			cm.off('change', editor_change);
			cm.off('scroll', editor_scroll);
			cm.off('mousedown', editor_mousedown);
			cm.off('paste', editor_paste);
			cm.off('drop', editor_drop);
			cm.off('dragover', editor_drag);
			editorParent.current.removeChild(cm.getWrapperElement());
			setEditor(null);
		};
	}, []);

	useEffect(() => {
		if (editor) {
			//  Value can also be changed by the editor itself so we need this guard
			//  to prevent loops
			if (props.value !== editor.getValue()) {
				editor.setValue(props.value);
				editor.clearHistory();
			}
			editor.setOption('screenReaderLabel', props.value);
			editor.setOption('theme', props.theme);
			editor.setOption('mode', props.mode);
			editor.setOption('readOnly', props.readOnly);
			editor.setOption('autoCloseBrackets', props.autoMatchBraces);
			editor.setOption('keyMap', props.keyMap ? props.keyMap : 'default');
		}
	}, [props.value, props.theme, props.mode, props.readOnly, props.autoMatchBraces, props.keyMap]);

	return <div style={props.style} ref={editorParent} />;
}

export default forwardRef(Editor);
