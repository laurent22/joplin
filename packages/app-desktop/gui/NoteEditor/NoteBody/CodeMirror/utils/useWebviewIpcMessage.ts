import type CodeMirror5Emulation from '@joplin/editor/CodeMirror/CodeMirror5Emulation/CodeMirror5Emulation';
import shared from '@joplin/lib/components/shared/note-screen-shared';
import { useCallback, RefObject } from 'react';

interface Props {
	onMessage(event: any): void;
	getLineScrollPercent(): number;
	setEditorPercentScroll(fraction: number): void;
	editorRef: RefObject<CodeMirror5Emulation>;
	content: string;
}

const useWebviewIpcMessage = (props: Props) => {
	const editorRef = props.editorRef;

	return useCallback((event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg.indexOf('checkboxclick:') === 0) {
			const { line, from, to } = shared.toggleCheckboxRange(msg, props.content);
			if (editorRef.current) {
				// To cancel CodeMirror's layout drift, the scroll position
				// is recorded before updated, and then it is restored.
				// Ref. https://github.com/laurent22/joplin/issues/5890
				const percent = props.getLineScrollPercent();
				editorRef.current.replaceRange(line, from, to);
				props.setEditorPercentScroll(percent);
			}
		} else if (msg === 'percentScroll') {
			const percent = arg0;
			props.setEditorPercentScroll(percent);
		} else {
			props.onMessage(event);
		}
	}, [
		props.onMessage,
		props.content,
		editorRef,
		props.getLineScrollPercent,
		props.setEditorPercentScroll,
	]);
};

export default useWebviewIpcMessage;
