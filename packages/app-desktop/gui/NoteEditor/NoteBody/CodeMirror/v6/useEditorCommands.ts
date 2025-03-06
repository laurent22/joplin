
import { RefObject, useMemo } from 'react';
import { CommandValue, DropCommandValue, ScrollToTextValue } from '../../../utils/types';
import { commandAttachFileToBody } from '../../../utils/resourceHandling';
import { _ } from '@joplin/lib/locale';
import dialogs from '../../../../dialogs';
import { EditorCommandType, UserEventSource } from '@joplin/editor/types';
import Logger from '@joplin/utils/Logger';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { MarkupLanguage } from '@joplin/renderer';
import { focus } from '@joplin/lib/utils/focusHandler';
import { FocusElementOptions } from '../../../../../commands/focusElement';

const logger = Logger.create('CodeMirror 6 commands');

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	webviewRef: RefObject<any>;
	editorRef: RefObject<CodeMirrorControl>;
	editorContent: string;

	editorCutText(): void;
	editorCopyText(): void;
	editorPaste(): void;
	selectionRange: { from: number; to: number };

	visiblePanes: string[];
	contentMarkupLanguage: MarkupLanguage;
}

const useEditorCommands = (props: Props) => {
	const editorRef = props.editorRef;

	return useMemo(() => {
		const selectedText = () => {
			if (!editorRef.current) return '';
			return editorRef.current.getSelection();
		};

		return {
			dropItems: async (cmd: DropCommandValue) => {
				let pos = cmd.pos && editorRef.current.editor.posAtCoords({ x: cmd.pos.clientX, y: cmd.pos.clientY });
				if (cmd.type === 'notes') {
					const text = cmd.markdownTags.join('\n');
					if ((pos ?? null) !== null) {
						editorRef.current.select(pos, pos);
					}

					editorRef.current.insertText(text, UserEventSource.Drop);
				} else if (cmd.type === 'files') {
					pos ??= props.selectionRange.from;
					const newBody = await commandAttachFileToBody(props.editorContent, cmd.paths, {
						createFileURL: !!cmd.createFileURL,
						position: pos,
						markupLanguage: props.contentMarkupLanguage,
					});
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
				focus('useEditorCommands::textLink', editorRef.current);
				if (url) {
					editorRef.current.wrapSelections('[', `](${url})`);
				}
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			insertText: (value: any) => editorRef.current.insertText(value),
			attachFile: async () => {
				const newBody = await commandAttachFileToBody(
					props.editorContent, null, { position: props.selectionRange.from, markupLanguage: props.contentMarkupLanguage },
				);
				if (newBody) {
					editorRef.current.updateBody(newBody);
				}
			},
			textHorizontalRule: () => editorRef.current.execCommand(EditorCommandType.InsertHorizontalRule),
			'editor.execCommand': (value: CommandValue) => {
				if (!('args' in value)) value.args = [];

				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				if ((editorRef.current as any)[value.name]) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const result = (editorRef.current as any)[value.name](...value.args);
					return result;
				} else if (editorRef.current.supportsCommand(value.name)) {
					const result = editorRef.current.execCommand(value.name, ...value.args);
					return result;
				} else {
					logger.warn('CodeMirror execCommand: unsupported command: ', value.name);
				}
			},
			'editor.focus': (options?: FocusElementOptions) => {
				if (props.visiblePanes.indexOf('editor') >= 0) {
					focus('useEditorCommands::editor.focus', editorRef.current.editor);
					if (options?.moveCursorToStart) {
						editorRef.current.editor.dispatch({
							selection: { anchor: 0 },
							scrollIntoView: true,
						});
					}
				} else {
					// If we just call focus() then the iframe is focused,
					// but not its content, such that scrolling up / down
					// with arrow keys fails
					props.webviewRef.current.send('focus');
				}
			},
			search: () => {
				return editorRef.current.execCommand(EditorCommandType.ShowSearch);
			},
			'editor.scrollToText': (value: ScrollToTextValue) => {
				value = {
					scrollStrategy: 'start',
					...value,
				};

				const valueToMarkdown = (value: ScrollToTextValue) => {
					const conv: Record<typeof value.element, (text: string)=> string> = {
						h1: text => `# ${text}`,
						h2: text => `## ${text}`,
						h3: text => `### ${text}`,
						h4: text => `#### ${text}`,
						h5: text => `##### ${text}`,
						strong: text => `**${text}**`,
						ul: text => `- ${text}`,
					};

					return conv[value.element](value.text);
				};

				return editorRef.current.scrollToText(valueToMarkdown(value), value.scrollStrategy);
			},
		};
	}, [
		props.visiblePanes, props.editorContent, props.editorCopyText, props.editorCutText, props.editorPaste,
		props.selectionRange,
		props.contentMarkupLanguage,
		props.webviewRef, editorRef,
	]);
};
export default useEditorCommands;
