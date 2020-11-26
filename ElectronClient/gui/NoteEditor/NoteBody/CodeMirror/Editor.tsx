import * as React from 'react';
import { useEffect, useImperativeHandle, useState, useRef, useCallback, forwardRef } from 'react';

import * as CodeMirror from 'codemirror';

import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/searchcursor';

import useListIdent from './utils/useListIdent';
import useScrollUtils from './utils/useScrollUtils';
import useCursorUtils from './utils/useCursorUtils';
import useLineSorting from './utils/useLineSorting';
import useEditorSearch from './utils/useEditorSearch';
import useJoplinMode from './utils/useJoplinMode';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';
import 'codemirror/keymap/sublime'; // Used for swapLineUp and swapLineDown

import 'codemirror/mode/meta';
const { shim } = require('lib/shim.js');

const { reg } = require('lib/registry.js');

// Based on http://pypl.github.io/PYPL.html
// +XML (HTML) +CSS and Markdown added
const topLanguages = [
	'python',
	'clike',
	'javascript',
	'jsx',
	'php',
	'r',
	'swift',
	'go',
	'vb',
	'vbscript',
	'ruby',
	'rust',
	'dart',
	'lua',
	'groovy',
	'perl',
	'cobol',
	'julia',
	'haskell',
	'pascal',
	'css',
	'xml',
	'markdown',
];
// Load Top Modes
for (let i = 0; i < topLanguages.length; i++) {
	const mode = topLanguages[i];

	if (CodeMirror.modeInfo.find((m: any) => m.mode === mode)) {
		require(`codemirror/mode/${mode}/${mode}`);
	} else {
		reg.logger().error('Cannot find CodeMirror mode: ', mode);
	}
}

export interface EditorProps {
	value: string,
	mode: string,
	style: any,
	theme: any,
	readOnly: boolean,
	autoMatchBraces: boolean,
	keyMap: string,
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
	useEditorSearch(CodeMirror);
	useJoplinMode(CodeMirror);

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

	useEffect(() => {
		CodeMirror.keyMap.basic = {
			'Left': 'goCharLeft',
			'Right': 'goCharRight',
			'Up': 'goLineUp',
			'Down': 'goLineDown',
			'End': 'goLineRight',
			'Home': 'goLineLeftSmart',
			'PageUp': 'goPageUp',
			'PageDown': 'goPageDown',
			'Delete': 'delCharAfter',
			'Backspace': 'delCharBefore',
			'Shift-Backspace': 'delCharBefore',
			'Tab': 'smartListIndent',
			'Shift-Tab': 'smartListUnindent',
			'Enter': 'insertListElement',
			'Insert': 'toggleOverwrite',
			'Esc': 'singleSelection',
		};

		if (shim.isMac()) {
			CodeMirror.keyMap.default = {
				// MacOS
				'Cmd-A': 'selectAll',
				'Cmd-D': 'deleteLine',
				'Cmd-Z': 'undo',
				'Shift-Cmd-Z': 'redo',
				'Cmd-Y': 'redo',
				'Cmd-Home': 'goDocStart',
				'Cmd-Up': 'goDocStart',
				'Cmd-End': 'goDocEnd',
				'Cmd-Down': 'goDocEnd',
				'Cmd-Left': 'goLineLeft',
				'Cmd-Right': 'goLineRight',
				'Alt-Left': 'goGroupLeft',
				'Alt-Right': 'goGroupRight',
				'Alt-Backspace': 'delGroupBefore',
				'Alt-Delete': 'delGroupAfter',
				'Cmd-[': 'indentLess',
				'Cmd-]': 'indentMore',
				'Cmd-/': 'toggleComment',
				'Cmd-Opt-S': 'sortSelectedLines',
				'Opt-Up': 'swapLineUp',
				'Opt-Down': 'swapLineDown',

				'fallthrough': 'basic',
			};
		} else {
			CodeMirror.keyMap.default = {
				// Windows/linux
				'Ctrl-A': 'selectAll',
				'Ctrl-D': 'deleteLine',
				'Ctrl-Z': 'undo',
				'Shift-Ctrl-Z': 'redo',
				'Ctrl-Y': 'redo',
				'Ctrl-Home': 'goDocStart',
				'Ctrl-End': 'goDocEnd',
				'Ctrl-Up': 'goLineUp',
				'Ctrl-Down': 'goLineDown',
				'Ctrl-Left': 'goGroupLeft',
				'Ctrl-Right': 'goGroupRight',
				'Alt-Left': 'goLineStart',
				'Alt-Right': 'goLineEnd',
				'Ctrl-Backspace': 'delGroupBefore',
				'Ctrl-Delete': 'delGroupAfter',
				'Ctrl-[': 'indentLess',
				'Ctrl-]': 'indentMore',
				'Ctrl-/': 'toggleComment',
				'Ctrl-Alt-S': 'sortSelectedLines',
				'Alt-Up': 'swapLineUp',
				'Alt-Down': 'swapLineDown',

				'fallthrough': 'basic',
			};
		}
	}, []);

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
			indentWithTabs: true,
			indentUnit: 4,
			spellcheck: true,
			allowDropFileTypes: [''], // disable codemirror drop handling
			keyMap: props.keyMap ? props.keyMap : 'default',
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
		}
	}, [props.value]);

	useEffect(() => {
		if (editor) {
			editor.setOption('theme', props.theme);
		}
	}, [props.theme]);

	useEffect(() => {
		if (editor) {
			editor.setOption('mode', props.mode);
		}
	}, [props.mode]);

	useEffect(() => {
		if (editor) {
			editor.setOption('readOnly', props.readOnly);
		}
	}, [props.readOnly]);

	useEffect(() => {
		if (editor) {
			editor.setOption('autoCloseBrackets', props.autoMatchBraces);
		}
	}, [props.autoMatchBraces]);

	useEffect(() => {
		if (editor) {
			editor.setOption('keyMap', props.keyMap ? props.keyMap : 'default');
		}
	}, [props.keyMap]);

	return <div style={props.style} ref={editorParent} />;
}

export default forwardRef(Editor);
