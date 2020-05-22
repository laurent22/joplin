import * as React from 'react';
import { useEffect, useImperativeHandle, useState,  useCallback, forwardRef } from 'react';

const CodeMirror = require('codemirror');
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/scrollpastend';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/search/search';

import useListIdent from './utils/useListIdent';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';

import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/xml/xml';
// Modes for syntax highlighting inside of code blocks
import 'codemirror/mode/python/python';

export interface EditorProps {
	value: string,
	mode: string,
	style: any,
	theme: any,
	readOnly: boolean,
	autoMatchBraces: boolean,
	keyMap: string,
	onChange: any,
}

function CodeMirrorEditor(props: EditorProps, ref: any) {
	const [editor, setEditor] = useState(null);

	// Codemirror plugins add new commands to codemirror (or change it's behavior)
	// This command adds the smartListIndent function which will be bound to tab
	useListIdent(CodeMirror);
	CodeMirror.keyMap.default['Ctrl-G'] = null;

	useImperativeHandle(ref, () => ({
		focus: () => {
			editor.focus();
		},
	}));

	// TODO: use the change deltas rather than getValue (should be faster)
	const editor_change = useCallback((cm, change) => {
		if (props.onChange && change.origin !== 'setValue') {
			props.onChange(cm.getValue());
		}
	}, []);

	const divRef = useCallback(node => {
		if (node !== null) {
			const cmOptions = {
				value: props.value,
				theme: props.theme,
				mode: props.mode,
				readOnly: props.readOnly,
				autoCloseBrackets: props.autoMatchBraces,
				inputStyle: 'contenteditable', // Has better support for screen readers
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
			cm.on('change', editor_change);
			console.log('!!!!!!!!!!!!New ref!!!!!!!!!!!!!!!');
		}
	}, []);

	useEffect(() => {
		if (editor) {
			editor.setValue(props.value);
			editor.clearHistory();
			console.log('!!!!!!!!!!UPDATE PROPS!!!!!!!!!!!!');
		}
	}, [props.value]);

	return <div style={props.style} ref={divRef} />;
}

export default forwardRef(CodeMirrorEditor);
