import * as React from 'react';
import { useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';

// eslint-disable-next-line no-unused-vars
import { DefaultEditorState, TextEditorUtils } from '../utils/NoteText';

export interface OnChangeEvent {
	changeId: number,
	content: any,
}

interface PlainEditorProps {
	style: any,
	onChange(event: OnChangeEvent): void,
	onWillChange(event:any): void,
	defaultEditorState: DefaultEditorState,
	markupToHtml: Function,
	attachResources: Function,
	disabled: boolean,
}

export const utils:TextEditorUtils = {
	editorContentToHtml(content:any):Promise<string> {
		return content ? content : '';
	},
};

const PlainEditor = (props:PlainEditorProps, ref:any) => {
	const editorRef = useRef<any>();

	useImperativeHandle(ref, () => {
		return {
			content: () => '',
		};
	}, []);

	useEffect(() => {
		if (!editorRef.current) return;
		editorRef.current.value = props.defaultEditorState.value;
	}, [props.defaultEditorState]);

	const onChange = useCallback((event:any) => {
		props.onChange({ changeId: null, content: event.target.value });
	}, [props.onWillChange, props.onChange]);

	return (
		<div style={props.style}>
			<textarea
				ref={editorRef}
				style={{ width: '100%', height: '100%' }}
				defaultValue={props.defaultEditorState.value}
				onChange={onChange}
			/>;
		</div>
	);
};

export default forwardRef(PlainEditor);

