import * as React from 'react';
//  @ts-ignore
import { useImperativeHandle, useState,  useCallback, forwardRef } from 'react';

const CodeMirror = require('codemirror');
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/python/python';

// TODO: This needs to be moved to ../../utils/types
export interface EditorProps {
	value: string,
	mode: string,
	style: any,
	theme: any,
	onChange: any,
}

function CodeMirrorEditor(props: EditorProps, ref: any) {
//  @ts-ignore
	const [editor, setEditor] = useState(null);

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
				inputStyle: 'contenteditable',
				lineWrapping: true,
			};
			const cm = CodeMirror(node, cmOptions);
			setEditor(cm);
			cm.on('change', editor_change);
			console.log('New ref');
		}
	}, []);

	// useEffect(() => {
	// 	if (editor !== null) {
	// 		editor.setOption('theme', props.theme);
	// 	}
	// }, [editor]);

	//  @ts-ignore
	return <div style={props.style} ref={divRef} />;
}

export default forwardRef(CodeMirrorEditor);
