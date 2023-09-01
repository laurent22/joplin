import * as React from 'react';
import { ForwardedRef } from 'react';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorProps } from '@joplin/editor/types';
import createEditor, { CodeMirrorControl } from '@joplin/editor/CodeMirror/createEditor';

interface Props extends EditorProps {
	style: React.CSSProperties;
}

const Editor = (props: Props, ref: ForwardedRef<CodeMirrorControl>) => {
	const editorContainerRef = useRef<HTMLDivElement>();
	const [editor, setEditor] = useState<CodeMirrorControl|null>(null);

	useImperativeHandle(ref, () => {
		return editor;
	}, [editor]);

	useEffect(() => {
		if (!editorContainerRef.current) return () => {};

		const editor = createEditor(editorContainerRef.current, props);
		editor.addStyles({
			'.cm-scroller': { overflow: 'auto' },
		});
		setEditor(editor);

		return () => {
			editor.editor.contentDOM.remove();
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- TODO: Refactor to re-apply settings on change
	}, []);

	return (
		<>
			<div
				style={props.style}
				ref={editorContainerRef}
			></div>
		</>
	);
};

export default forwardRef(Editor);
