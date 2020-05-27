import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { commandAttachFileToBody, handlePasteEvent } from '../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../utils/types';
import { useScrollHandler, usePrevious, selectionRange, selectionRangeCurrentLine, selectionRangePreviousLine, textOffsetSelection } from './utils';
import Toolbar from './Toolbar';
import styles_ from './styles';
import { RenderedBody, defaultRenderedBody } from './utils/types';
import Editor from './Editor';

//  @ts-ignore
const { bridge } = require('electron').remote.require('./bridge');
//  @ts-ignore
const Note = require('lib/models/Note.js');
const { clipboard } = require('electron');
const Setting = require('lib/models/Setting.js');
const NoteTextViewer = require('../../../NoteTextViewer.min');
const shared = require('lib/components/shared/note-screen-shared.js');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const markdownUtils = require('lib/markdownUtils');
const { _ } = require('lib/locale');
const { reg } = require('lib/registry.js');
const dialogs = require('../../../dialogs');

function markupRenderOptions(override: any = null) {
	return { ...override };
}

function CodeMirror(props: NoteBodyEditorProps, ref: any) {
	const styles = styles_(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [webviewReady, setWebviewReady] = useState(false);

	const previousRenderedBody = usePrevious(renderedBody);
	const previousSearchMarkers = usePrevious(props.searchMarkers);
	const previousContentKey = usePrevious(props.contentKey);

	const editorRef = useRef(null);
	const rootRef = useRef(null);
	const webviewRef = useRef(null);
	const props_onChangeRef = useRef<Function>(null);
	props_onChangeRef.current = props.onChange;
	const contentKeyHasChangedRef = useRef(false);
	contentKeyHasChangedRef.current = previousContentKey !== props.contentKey;

	const { resetScroll, editor_scroll, setEditorPercentScroll, setViewerPercentScroll } = useScrollHandler(editorRef, webviewRef, props.onScroll);

	const cancelledKeys: {mac: string[], default: string[]} = { mac: [], default: [] };
	// Remove Joplin reserved key bindings from the editor
	const letters = ['F', 'T', 'P', 'Q', 'L', ',', 'G', 'K'];
	for (let i = 0; i < letters.length; i++) {
		const l = letters[i];
		cancelledKeys.default.push(`Ctrl-${l}`);
		cancelledKeys.mac.push(`Cmd-${l}`);
	}
	cancelledKeys.default.push('Alt-E');
	cancelledKeys.mac.push('Alt-E');

	const codeMirror_change = useCallback((newBody: string) => {
		props_onChangeRef.current({ changeId: null, content: newBody });
	}, []);

	const wrapSelectionWithStrings = useCallback((string1: string, string2 = '', defaultText = '', replacementText: string = null, byLine = false) => {
		if (!editorRef.current) return;

		if (editorRef.current.somethingSelected()) {
			const selectedStrings = editorRef.current.getSelections();

			//  byLine will wrap each line of a selection with the given strings
			//  and it doesn't care about whitespace
			if (byLine) {
				for (let i = 0; i < selectedStrings.length; i++) {
					const selected = replacementText !== null ? replacementText : selectedStrings[i];
					const lines = selected.split(/\r?\n/);
					//  Save the newline character to restore it later
					const newLines = selected.match(/\r?\n/);

					for (let j = 0; j < lines.length; j++) {
						const line = lines[j];
						lines[j] = string1 + line + string2;
					}

					const newLine = newLines !== null ? newLines[0] : '\n';
					selectedStrings[i] = lines.join(newLine);
				}
			} else {
				for (let i = 0; i < selectedStrings.length; i++) {
					const selected = replacementText !== null ? replacementText : selectedStrings[i];
					const start = selected.search(/[^\s]/);
					const end = selected.search(/[^\s](?=[\s]*$)/);
					const replacement = selected.substr(0, start) + string1 + selected.substr(start, end - start + 1) + string2 + selected.substr(end + 1);

					selectedStrings[i] = replacement;
				}
			}

			editorRef.current.replaceSelections(selectedStrings);
			editorRef.current.focus();

		} else {
			const middleText = replacementText !== null ? replacementText : defaultText;
			const insert = string1 + middleText + string2;

			editorRef.current.insertAtCursor(insert);
			editorRef.current.focus();
		}

	}, [props.content]);

	const addListItem = useCallback((string1, string2 = '', defaultText = '', byLine = false) => {
		if (editorRef.current) {
			let newLine = '';
			if (editorRef.current.somethingSelected() || editorRef.current.getCursor().ch !== 0) {
				newLine = '\n';
			}
			wrapSelectionWithStrings(newLine + string1, string2, defaultText, null, byLine);
		}
	}, [wrapSelectionWithStrings]);

	useImperativeHandle(ref, () => {
		return {
			content: () => props.content,
			resetScroll: () => {
				resetScroll();
			},
			scrollTo: (options:ScrollOptions) => {
				if (options.type === ScrollOptionTypes.Hash) {
					if (!webviewRef.current) return;
					webviewRef.current.wrappedInstance.send('scrollToHash', options.value as string);
				} else if (options.type === ScrollOptionTypes.Percent) {
					const p = options.value as number;
					setEditorPercentScroll(p);
					setViewerPercentScroll(p);
				} else {
					throw new Error(`Unsupported scroll options: ${options.type}`);
				}
			},
			supportsCommand: (/* name:string*/) => {
				// TODO: not implemented, currently only used for "search" command
				// which is not directly supported by Ace Editor.
				return false;
			},
			execCommand: async (cmd: EditorCommand) => {
				if (!editorRef.current) return false;

				reg.logger().debug('CodeMirror: execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'dropItems') {
					console.log('drop!!!!!!!!!!!!!');
					if (cmd.value.type === 'notes') {
						wrapSelectionWithStrings('', '', '', cmd.value.markdownTags.join('\n'));
					} else if (cmd.value.type === 'files') {
						const newBody = await commandAttachFileToBody(props.content, cmd.value.paths, { createFileURL: !!cmd.value.createFileURL });
						codeMirror_change(newBody);
					} else {
						reg.logger().warn('CodeMirror: unsupported drop item: ', cmd);
					}
				} else if (cmd.name === 'focus') {
					editorRef.current.focus();
				} else {
					commandProcessed = false;
				}

				if (!commandProcessed) {
					const commands: any = {
						textBold: () => wrapSelectionWithStrings('**', '**', _('strong text')),
						textItalic: () => wrapSelectionWithStrings('*', '*', _('emphasized text')),
						textLink: async () => {
							const url = await dialogs.prompt(_('Insert Hyperlink'));
							if (url) wrapSelectionWithStrings('[', `](${url})`);
						},
						textCode: () => {
							const selection = textOffsetSelection(selectionRange(editorRef.current), props.content);
							const string = props.content.substr(selection.start, selection.end - selection.start);

							// Look for newlines
							const match = string.match(/\r?\n/);

							if (match && match.length > 0) {
								if (string.startsWith('```') && string.endsWith('```')) {
									wrapSelectionWithStrings('', '', '', string.substr(4, selection.end - selection.start - 8));
								} else {
									wrapSelectionWithStrings(`\`\`\`${match[0]}`, `${match[0]}\`\`\``);
								}
							} else {
								wrapSelectionWithStrings('`', '`', '');
							}
						},
						insertText: (value: any) => wrapSelectionWithStrings(value),
						attachFile: async () => {
							const selection = textOffsetSelection(selectionRange(editorRef.current), props.content);
							const newBody = await commandAttachFileToBody(props.content, null, { position: selection ? selection.start : 0 });
							if (newBody) codeMirror_change(newBody);
						},
						textNumberedList: () => {
							const selection = selectionRange(editorRef.current);
							let bulletNumber = markdownUtils.olLineNumber(selectionRangeCurrentLine(selection, props.content));
							if (!bulletNumber) bulletNumber = markdownUtils.olLineNumber(selectionRangePreviousLine(selection, props.content));
							if (!bulletNumber) bulletNumber = 0;
							addListItem(`${bulletNumber + 1}. `, '', _('List item'), true);
						},
						textBulletedList: () => addListItem('- ', '', _('List item'), true),
						textCheckbox: () => addListItem('- [ ] ', '', _('List item'), true),
						textHeading: () => addListItem('## ','','', true),
						textHorizontalRule: () => addListItem('* * *'),
					};

					if (commands[cmd.name]) {
						commands[cmd.name](cmd.value);
					} else {
						reg.logger().warn('CodeMirror: unsupported Joplin command: ', cmd);
						return false;
					}
				}

				return true;
			},
		};
	}, [props.content, addListItem, wrapSelectionWithStrings, selectionRangeCurrentLine, codeMirror_change, setEditorPercentScroll, setViewerPercentScroll, resetScroll, renderedBody]);

	const onEditorPaste = useCallback(async (event: any = null) => {
		const resourceMds = await handlePasteEvent(event);
		if (!resourceMds.length) return;
		wrapSelectionWithStrings('', '', resourceMds.join('\n'));
	}, [wrapSelectionWithStrings]);

	const editorCutText = useCallback(() => {
		if (editorRef.current) {
			const selections = editorRef.current.getSelections();
			if (selections.length > 0) {
				clipboard.writeText(selections[0]);
				// Easy way to wipe out just the first selection
				selections[0] = '';
				editorRef.current.replaceSelections(selections);
			}
		}
	}, []);

	const editorCopyText = useCallback(() => {
		if (editorRef.current) {
			const selections = editorRef.current.getSelections();
			if (selections.length > 0) {
				clipboard.writeText(selections[0]);
			}
		}
	}, []);

	const editorPasteText = useCallback(() => {
		wrapSelectionWithStrings(clipboard.readText(), '', '', '');
	}, [wrapSelectionWithStrings]);

	const onEditorContextMenu = useCallback(() => {
		const menu = new Menu();

		const hasSelectedText = editorRef.current && !!editorRef.current.getSelection() ;
		const clipboardText = clipboard.readText();

		menu.append(
			new MenuItem({
				label: _('Cut'),
				enabled: hasSelectedText,
				click: async () => {
					editorCutText();
				},
			})
		);

		menu.append(
			new MenuItem({
				label: _('Copy'),
				enabled: hasSelectedText,
				click: async () => {
					editorCopyText();
				},
			})
		);

		menu.append(
			new MenuItem({
				label: _('Paste'),
				enabled: true,
				click: async () => {
					if (clipboardText) {
						editorPasteText();
					} else {
						// To handle pasting images
						onEditorPaste();
					}
				},
			})
		);

		menu.popup(bridge().window());
	}, [props.content, editorCutText, editorPasteText, editorCopyText, onEditorPaste]);

	const webview_domReady = useCallback(() => {
		setWebviewReady(true);
	}, []);

	const webview_ipcMessage = useCallback((event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, props.content);
			codeMirror_change(newBody);
		} else if (msg === 'percentScroll') {
			setEditorPercentScroll(arg0);
		} else {
			props.onMessage(event);
		}
	}, [props.onMessage, props.content, codeMirror_change, setEditorPercentScroll]);

	useEffect(() => {
		let cancelled = false;

		const interval = contentKeyHasChangedRef.current ? 0 : 500;

		const timeoutId = setTimeout(async () => {
			let bodyToRender = props.content;

			if (!bodyToRender.trim() && props.visiblePanes.indexOf('viewer') >= 0 && props.visiblePanes.indexOf('editor') < 0) {
				// Fixes https://github.com/laurent22/joplin/issues/217
				bodyToRender = `<i>${_('This note has no content. Click on "%s" to toggle the editor and edit the note.', _('Layout'))}</i>`;
			}

			const result = await props.markupToHtml(props.contentMarkupLanguage, bodyToRender, markupRenderOptions({ resourceInfos: props.resourceInfos }));
			if (cancelled) return;
			setRenderedBody(result);
		}, interval);

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
		};
	}, [props.content, props.contentMarkupLanguage, props.visiblePanes, props.resourceInfos, props.markupToHtml]);

	useEffect(() => {
		if (!webviewReady) return;

		const options: any = {
			pluginAssets: renderedBody.pluginAssets,
			downloadResources: Setting.value('sync.resourceDownloadMode'),
		};
		webviewRef.current.wrappedInstance.send('setHtml', renderedBody.html, options);
	}, [renderedBody, webviewReady]);

	useEffect(() => {
		if (props.searchMarkers !== previousSearchMarkers || renderedBody !== previousRenderedBody) {
			webviewRef.current.wrappedInstance.send('setMarkers', props.searchMarkers.keywords, props.searchMarkers.options);
		}
	}, [props.searchMarkers, renderedBody]);

	const cellEditorStyle = useMemo(() => {
		const output = { ...styles.cellEditor };
		if (!props.visiblePanes.includes('editor')) {
			output.display = 'none'; // Seems to work fine since the refactoring
		}

		return output;
	}, [styles.cellEditor, props.visiblePanes]);

	const cellViewerStyle = useMemo(() => {
		const output = { ...styles.cellViewer };
		if (!props.visiblePanes.includes('viewer')) {
			// Note: setting webview.display to "none" is currently not supported due
			// to this bug: https://github.com/electron/electron/issues/8277
			// So instead setting the width 0.
			output.width = 1;
			output.maxWidth = 1;
		} else if (!props.visiblePanes.includes('editor')) {
			output.borderLeftStyle = 'none';
		}
		return output;
	}, [styles.cellViewer, props.visiblePanes]);

	function renderEditor() {
		return (
			<div style={cellEditorStyle}>
				<Editor
					value={props.content}
					ref={editorRef}
					mode={props.contentMarkupLanguage === Note.MARKUP_LANGUAGE_HTML ? 'xml' : 'gfm'}
					theme={styles.editor.editorTheme}
					style={styles.editor}
					readOnly={props.visiblePanes.indexOf('editor') < 0}
					autoMatchBraces={Setting.value('editor.autoMatchingBraces')}
					keyMap={props.keyboardMode}
					cancelledKeys={cancelledKeys}
					onChange={codeMirror_change}
					onScroll={editor_scroll}
					onEditorContextMenu={onEditorContextMenu}
					onEditorPaste={onEditorPaste}
				/>
			</div>
		);
	}

	function renderViewer() {
		return (
			<div style={cellViewerStyle}>
				<NoteTextViewer
					ref={webviewRef}
					viewerStyle={styles.viewer}
					onIpcMessage={webview_ipcMessage}
					onDomReady={webview_domReady}
				/>
			</div>
		);
	}

	return (
		<div style={styles.root} ref={rootRef}>
			<div style={styles.rowToolbar}>
				<Toolbar
					theme={props.theme}
					dispatch={props.dispatch}
				/>
				{props.noteToolbar}
			</div>
			<div style={styles.rowEditorViewer}>
				{renderEditor()}
				{renderViewer()}
			</div>
		</div>
	);
}

export default forwardRef(CodeMirror);

