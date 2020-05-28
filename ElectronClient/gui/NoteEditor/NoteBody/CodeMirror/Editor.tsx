import * as React from 'react';
import { useEffect, useImperativeHandle, useState,  useCallback, forwardRef } from 'react';

const CodeMirror = require('codemirror');
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/scrollpastend';

import useListIdent from './utils/useListIdent';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';

import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/xml/xml';
// Modes for syntax highlighting inside of code blocks
import 'codemirror/mode/python/python';

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
	const [editorParent, setEditorParent] = useState(null);

	// Codemirror plugins add new commands to codemirror (or change it's behavior)
	// This command adds the smartListIndent function which will be bound to tab
	useListIdent(CodeMirror);

	const getScrollHeight = useCallback(() => {
		if (editor) {
			const info = editor.getScrollInfo();
			const overdraw = editor.state.scrollPastEndPadding ? editor.state.scrollPastEndPadding : '0px';
			return info.height - info.clientHeight - parseInt(overdraw);
		}
		return 0;
	}, [editor]);

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
		return {
			focus: () => {
				editor.focus();
			},
			getSelection: () => {
				return editor.getSelection();
			},
			getScrollHeight: () => {
				return getScrollHeight();
			},
			getScrollPercent: () => {
				if (editor) {
					const info = editor.getScrollInfo();

					return info.top / getScrollHeight();
				}
				return 0;
			},
			setScrollPercent: (p: number) => {
				if (editor) {
					editor.scrollTo(null, p * getScrollHeight());
				}
			},
			somethingSelected: () => {
				return editor.somethingSelected();
			},
			getSelections: () => {
				return editor.getSelections();
			},
			listSelections: () => {
				return editor.listSelections();
			},
			replaceSelections: (replacement: string[]) => {
				editor.replaceSelections(replacement, 'around');
			},
			getCursor: () => {
				return editor.getCursor('anchor');
			},
			insertAtCursor: (insert: string) => {
				const pos = editor.getCursor('anchor');
				editor.replaceRange(insert, pos);
			},
			getCurrentLine: () => {
				const curs = editor.getCursor('anchor');

				return editor.getLine(curs.line);
			},
			getPreviousLine: () => {
				const curs = editor.getCursor('anchor');

				if (curs.line > 0) { return editor.getLine(curs.line - 1); }
				return '';
			},
			updateBody: (newBody: string) => {
				// this updates the body in a way that registers with the undo/redo
				const start = { line: editor.firstLine(), ch: 0 };
				const last = editor.getLine(editor.lastLine());
				const end = { line: editor.lastLine(), ch: last ? last.length : 0 };

				editor.replaceRange(newBody, start, end, '+insert');
			},
		};
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

	const editor_drop = useCallback((_cm: any, event: any) => {
		event.preventDefault();
	}, []);

	const divRef = useCallback(node => {
		if (node !== null) {
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
				keyMap: props.keyMap ? props.keyMap : 'default',
				extraKeys: { 'Enter': 'newlineAndIndentContinueMarkdownList',
					'Ctrl-/': 'toggleComment',
					'Tab': 'smartListIndent',
					'Shift-Tab': 'smartListUnindent' },
			};
			const cm = CodeMirror(node, cmOptions);
			setEditor(cm);
			setEditorParent(node);
			cm.on('change', editor_change);
			cm.on('scroll', editor_scroll);
			cm.on('mousedown', editor_mousedown);
			cm.on('paste', editor_paste);
			cm.on('drop', editor_drop);
		} else {
			if (editor) {
				// Clean up codemirror
				editor.off('change', editor_change);
				editor.off('scroll', editor_scroll);
				editor.off('mousedown', editor_mousedown);
				editor.off('paste', editor_paste);
				editor.off('drop', editor_drop);
				editorParent.removeChild(editor.getWrapperElement());
				setEditor(null);
			}
		}
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

	return <div style={props.style} ref={divRef} />;
}

export default forwardRef(Editor);
