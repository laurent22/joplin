import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor, EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { draftToMarkdown, markdownToDraft } from 'markdown-draft-js';

// const Setting = require('lib/models/Setting');
// const markupLanguageUtils = require('lib/markupLanguageUtils');


interface DraftJsProps {
	style: any,
	value: string,
	onChange: Function,
}

export interface DraftJsChangeEvent {
	value: string
}

export function markdownToValue(md:string):any {
	if (!md) return EditorState.createEmpty();

	const rawData = markdownToDraft(md);
	const contentState = convertFromRaw(rawData);
	return EditorState.createWithContent(contentState);
}

export function valueToMarkdown(value:any):string {
	const content = value.getCurrentContent();
	const rawObject = convertToRaw(content);
	return draftToMarkdown(rawObject);
}

export default function DraftJs(props:DraftJsProps) {
	const onChange = (editorState) => {
		props.onChange({ value: editorState });
	};

	return (
    	<div style={props.style}>
	      <Editor editorState={props.value} onChange={onChange} />
	     </div>
	);
}
