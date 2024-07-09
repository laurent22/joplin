import * as React from 'react';
import { ForwardedRef } from 'react';
import { useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { NoteBodyEditorProps, NoteBodyEditorRef } from '../../utils/types';
const { clipboard } = require('electron');

const PlainEditor = (props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) => {
	const editorRef = useRef<HTMLTextAreaElement>();

	useEffect(() => {
		if (!editorRef.current) return;

		if (editorRef.current.value !== props.content) {
			editorRef.current.value = props.content;
		}
	}, [props.content]);

	const onChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		props.onChange({ changeId: null, content: event.target.value });
	}, [props.onChange]);

	const editorCopyText = useCallback(() => {
		if (editorRef.current) {
			const selectedText = editorRef.current.value.substring(
				editorRef.current.selectionStart,
				editorRef.current.selectionEnd,
			);
			clipboard.writeText(selectedText);
		}
	}, []);

	const editorCutText = useCallback(() => {
		if (editorRef.current) {
			const selectedText = editorRef.current.value.substring(
				editorRef.current.selectionStart,
				editorRef.current.selectionEnd,
			);
			clipboard.writeText(selectedText);

			const newValue =
				editorRef.current.value.slice(0, editorRef.current.selectionStart) +
				editorRef.current.value.slice(editorRef.current.selectionEnd);

			editorRef.current.value = newValue;
			props.onChange({ changeId: null, content: newValue });
		}
	}, [props]);

	const editorPaste = useCallback(() => {
		if (editorRef.current) {
			const clipboardText = clipboard.readText();

			const preservedText = clipboardText.replace(/^([ \t]*)([-*+]|\d+\.) \[ \]/gm, '$1- [ ]');

			const selectionStart = editorRef.current.selectionStart;
			const selectionEnd = editorRef.current.selectionEnd;

			const newValue =
			editorRef.current.value.slice(0, selectionStart) +
			preservedText +
			editorRef.current.value.slice(selectionEnd);

			editorRef.current.value = newValue;
			props.onChange({ changeId: null, content: newValue });

			editorRef.current.setSelectionRange(
				selectionStart + preservedText.length,
				selectionStart + preservedText.length,
			);
		}
	}, [props]);


	useImperativeHandle(ref, () => {
		return {
			content: () => editorRef.current?.value ?? '',
			resetScroll: () => {
				editorRef.current.scrollTop = 0;
			},
			scrollTo: () => {
				// Not supported
			},
			supportsCommand: (name: string) => {
				return ['textCopy', 'textCut', 'textPaste'].includes(name);
			},
			execCommand: async (command) => {
				if (command.name === 'textCopy') {
					editorCopyText();
				} else if (command.name === 'textCut') {
					editorCutText();
				} else if (command.name === 'textPaste') {
					editorPaste();
				}
			},
		};
	}, [editorCopyText, editorCutText, editorPaste]);

	return (
		<div style={props.style}>
			<textarea
				ref={editorRef}
				style={{ width: '100%', height: '100%' }}
				defaultValue={props.content}
				onChange={onChange}
			/>
		</div>
	);
};

export default forwardRef(PlainEditor);
