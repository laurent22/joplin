
import { RefObject, useMemo } from 'react';
import { CommandValue } from '../../../utils/types';
import { commandAttachFileToBody } from '../../../utils/resourceHandling';
import { _ } from '@joplin/lib/locale';
import dialogs from '../../../../dialogs';
import { EditorCommandType } from '@joplin/editor/types';
import Logger from '@joplin/utils/Logger';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';

const logger = Logger.create('CodeMirror 6 commands');

const wrapSelectionWithStrings = (editor: CodeMirrorControl, string1: string, string2 = '', defaultText = '') => {
	if (editor.somethingSelected()) {
		editor.wrapSelections(string1, string2);
	} else {
		editor.wrapSelections(string1 + defaultText, string2);

		// Now select the default text so the user can replace it
		const selections = editor.listSelections();
		const newSelections = [];
		for (let i = 0; i < selections.length; i++) {
			const s = selections[i];
			const anchor = { line: s.anchor.line, ch: s.anchor.ch + string1.length };
			const head = { line: s.head.line, ch: s.head.ch - string2.length };
			newSelections.push({ anchor: anchor, head: head });
		}
		editor.setSelections(newSelections);
	}
};

interface Props {
	webviewRef: RefObject<any>;
	editorRef: RefObject<CodeMirrorControl>;
	editorContent: string;

	editorCutText(): void;
	editorCopyText(): void;
	editorPaste(): void;
	selectionRange: { from: number; to: number };

	visiblePanes: string[];
}

const useEditorCommands = (props: Props) => {
	const editorRef = props.editorRef;

	return useMemo(() => {
		const selectedText = () => {
			if (!editorRef.current) return '';
			return editorRef.current.getSelection();
		};

		return {
			dropItems: async (cmd: any) => {
				if (cmd.type === 'notes') {
					editorRef.current.insertText(cmd.markdownTags.join('\n'));
				} else if (cmd.type === 'files') {
					const pos = props.selectionRange.from;
					const newBody = await commandAttachFileToBody(props.editorContent, cmd.paths, { createFileURL: !!cmd.createFileURL, position: pos });
					editorRef.current.updateBody(newBody);
				} else {
					logger.warn('CodeMirror: unsupported drop item: ', cmd);
				}
			},
			selectedText: () => {
				return selectedText();
			},
			selectedHtml: () => {
				return selectedText();
			},
			replaceSelection: (value: string) => {
				return editorRef.current.insertText(value);
			},
			textCopy: () => {
				props.editorCopyText();
			},
			textCut: () => {
				props.editorCutText();
			},
			textPaste: () => {
				props.editorPaste();
			},
			textSelectAll: () => {
				return editorRef.current.execCommand(EditorCommandType.SelectAll);
			},
			textLink: async () => {
				const url = await dialogs.prompt(_('Insert Hyperlink'));
				editorRef.current.focus();
				if (url) wrapSelectionWithStrings(editorRef.current, '[', `](${url})`);
			},
			insertText: (value: any) => editorRef.current.insertText(value),
			attachFile: async () => {
				const newBody = await commandAttachFileToBody(
					props.editorContent, null, { position: props.selectionRange.from },
				);
				if (newBody) {
					editorRef.current.updateBody(newBody);
				}
			},
			textHorizontalRule: () => editorRef.current.insertText('* * *'),
			'editor.execCommand': (value: CommandValue) => {
				if (!('args' in value)) value.args = [];

				if ((editorRef.current as any)[value.name]) {
					const result = (editorRef.current as any)[value.name](...value.args);
					return result;
				} else if (editorRef.current.commandExists(value.name)) {
					const result = editorRef.current.execCommand(value.name);
					return result;
				} else {
					logger.warn('CodeMirror execCommand: unsupported command: ', value.name);
				}
			},
			'editor.focus': () => {
				if (props.visiblePanes.indexOf('editor') >= 0) {
					editorRef.current.editor.focus();
				} else {
					// If we just call focus() then the iframe is focused,
					// but not its content, such that scrolling up / down
					// with arrow keys fails
					props.webviewRef.current.send('focus');
				}
			},
			search: () => {
				editorRef.current.execCommand(EditorCommandType.ShowSearch);
			},
		};
	}, [
		props.visiblePanes, props.editorContent, props.editorCopyText, props.editorCutText, props.editorPaste,
		props.selectionRange,

		props.webviewRef, editorRef,
	]);
};
export default useEditorCommands;
