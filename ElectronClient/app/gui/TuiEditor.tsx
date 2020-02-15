import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
const Editor = require('tui-editor');

// const Setting = require('lib/models/Setting');
// const markupLanguageUtils = require('lib/markupLanguageUtils');


interface TuiEditorProps {
	style: any,
	value: string,
	onChange: Function,
}

export interface TuiEditorChangeEvent {
	value: string
}

export default function TuiEditor(props:TuiEditorProps) {
	const editorRef = useRef(null);
	const [editor, setEditor] = useState(null);

	useEffect(() => {
		const editor_ = new Editor({
			el: document.querySelector('#editSection'),
			initialEditType: 'wysiwyg',
			previewStyle: 'vertical',
			usageStatistics: false,
			width: props.style.width,
			height: props.style.height,
		});

		// const markupToHtml = markupLanguageUtils.newMarkupToHtml({
		// 	resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		// });

		// markdownIt.use(rules.image(context, ruleOptions));

		// Editor.markdownit.renderer.rules.image = function (tokens, idx, options, env, self) {
		// 	return 'image!';
		// }

		setEditor(editor_);
	}, []);

	useEffect(() => {
		if (!editor) return;

		editor.addHook('change', () => {
			props.onChange({ value: editor.getValue() });
		});

		return () => {
			editor.removeHook('change');
		};
	}, [editor, props.onChange]);

	useEffect(() => {
		if (editor) editor.setMarkdown(props.value);
	}, [editor, props.value]);

	return <div ref={editorRef} id='editSection'/>;
}
