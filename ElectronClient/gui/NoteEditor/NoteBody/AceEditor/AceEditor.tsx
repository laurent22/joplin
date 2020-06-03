import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { commandAttachFileToBody, handlePasteEvent } from '../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../utils/types';
import { textOffsetToCursorPosition, useScrollHandler, useRootWidth, usePrevious, lineLeftSpaces, selectionRange, selectionRangeCurrentLine, selectionRangePreviousLine, currentTextOffset, textOffsetSelection, selectedText } from './utils';
import useListIdent from './utils/useListIdent';
import useFocus from './utils/useFocus';
import Toolbar from './Toolbar';
import styles_ from './styles';
import { RenderedBody, defaultRenderedBody } from './utils/types';

const AceEditorReact = require('react-ace').default;
const { bridge } = require('electron').remote.require('./bridge');
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

require('brace/mode/markdown');
// https://ace.c9.io/build/kitchen-sink.html
// https://highlightjs.org/static/demo/
require('brace/theme/chrome');
require('brace/theme/solarized_light');
require('brace/theme/solarized_dark');
require('brace/theme/twilight');
require('brace/theme/dracula');
require('brace/theme/chaos');
require('brace/theme/tomorrow');
require('brace/keybinding/vim');
require('brace/keybinding/emacs');
require('brace/theme/terminal');

// TODO: Could not get below code to work

// @ts-ignore Ace global variable
// const aceGlobal = (ace as any);

// class CustomHighlightRules extends aceGlobal.acequire(
// 	'ace/mode/markdown_highlight_rules'
// ).MarkdownHighlightRules {
// 	constructor() {
// 		super();
// 		if (Setting.value('markdown.plugin.mark')) {
// 			this.$rules.start.push({
// 				// This is actually a highlight `mark`, but Ace has no token name for
// 				// this so we made up our own. Reference for common tokens here:
// 				// https://github.com/ajaxorg/ace/wiki/Creating-or-Extending-an-Edit-Mode#common-tokens
// 				token: 'highlight_mark',
// 				regex: '==[^ ](?:.*?[^ ])?==',
// 			});
// 		}
// 	}
// }

// /* eslint-disable-next-line no-undef */
// class CustomMdMode extends aceGlobal.acequire('ace/mode/markdown').Mode {
// 	constructor() {
// 		super();
// 		this.HighlightRules = CustomHighlightRules;
// 	}
// }

function markupRenderOptions(override: any = null) {
	return { ...override };
}

function AceEditor(props: NoteBodyEditorProps, ref: any) {
	const styles = styles_(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [editor, setEditor] = useState(null);
	const [lastKeys, setLastKeys] = useState([]);
	const [webviewReady, setWebviewReady] = useState(false);

	const previousRenderedBody = usePrevious(renderedBody);
	const previousSearchMarkers = usePrevious(props.searchMarkers);
	const previousContentKey = usePrevious(props.contentKey);

	const editorRef = useRef(null);
	editorRef.current = editor;
	const rootRef = useRef(null);
	const webviewRef = useRef(null);
	const props_onChangeRef = useRef<Function>(null);
	props_onChangeRef.current = props.onChange;
	const contentKeyHasChangedRef = useRef(false);
	contentKeyHasChangedRef.current = previousContentKey !== props.contentKey;

	const rootWidth = useRootWidth({ rootRef });

	const { resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll } = useScrollHandler(editor, webviewRef, props.onScroll);

	useListIdent({ editor });

	const aceEditor_change = useCallback((newBody: string) => {
		props_onChangeRef.current({ changeId: null, content: newBody });
	}, []);

	const wrapSelectionWithStrings = useCallback((string1: string, string2 = '', defaultText = '', replacementText: string = null, byLine = false) => {
		if (!editor) return;

		const selection = textOffsetSelection(selectionRange(editor), props.content);

		let newBody = props.content;

		if (selection && selection.start !== selection.end) {
			const selectedLines = replacementText !== null ? replacementText : props.content.substr(selection.start, selection.end - selection.start);
			const selectedStrings = byLine ? selectedLines.split(/\r?\n/) : [selectedLines];

			newBody = props.content.substr(0, selection.start);

			let startCursorPos, endCursorPos;

			for (let i = 0; i < selectedStrings.length; i++) {
				if (byLine == false) {
					const start = selectedStrings[i].search(/[^\s]/);
					const end = selectedStrings[i].search(/[^\s](?=[\s]*$)/);
					newBody += selectedStrings[i].substr(0, start) + string1 + selectedStrings[i].substr(start, end - start + 1) + string2 + selectedStrings[i].substr(end + 1);
					// Getting position for correcting offset in highlighted text when surrounded by white spaces
					startCursorPos = textOffsetToCursorPosition(selection.start + start, newBody);
					endCursorPos = textOffsetToCursorPosition(selection.start + end + 1, newBody);

				} else { newBody += string1 + selectedStrings[i] + string2; }

			}

			newBody += props.content.substr(selection.end);

			const r = selectionRange(editor);

			// Because some insertion strings will have newlines, we'll need to account for them
			const str1Split = string1.split(/\r?\n/);

			// Add the number of newlines to the row
			// and add the length of the final line to the column (for strings with no newlines this is the string length)

			let newRange: any = {};
			if (!byLine) {
				// Correcting offset in Highlighted text when surrounded by white spaces
				newRange = {
					start: {
						row: startCursorPos.row,
						column: startCursorPos.column + string1.length,
					},
					end: {
						row: endCursorPos.row,
						column: endCursorPos.column + string1.length,
					},
				};
			} else {
				newRange = {
					start: {
						row: r.start.row + str1Split.length - 1,
						column: r.start.column + str1Split[str1Split.length - 1].length,
					},
					end: {
						row: r.end.row + str1Split.length - 1,
						column: r.end.column + str1Split[str1Split.length - 1].length,
					},
				};
			}

			if (replacementText !== null) {
				const diff = replacementText.length - (selection.end - selection.start);
				newRange.end.column += diff;
			}

			setTimeout(() => {
				const range = selectionRange(editor);
				range.setStart(newRange.start.row, newRange.start.column);
				range.setEnd(newRange.end.row, newRange.end.column);
				editor.getSession().getSelection().setSelectionRange(range, false);
				editor.focus();
			}, 10);
		} else {
			const middleText = replacementText !== null ? replacementText : defaultText;
			const textOffset = currentTextOffset(editor, props.content);
			const s1 = props.content.substr(0, textOffset);
			const s2 = props.content.substr(textOffset);
			newBody = s1 + string1 + middleText + string2 + s2;

			const p = textOffsetToCursorPosition(textOffset + string1.length, newBody);
			const newRange = {
				start: { row: p.row, column: p.column },
				end: { row: p.row, column: p.column + middleText.length },
			};

			// BUG!! If replacementText contains newline characters, the logic
			// to select the new text will not work.

			setTimeout(() => {
				if (middleText && newRange) {
					const range = selectionRange(editor);
					range.setStart(newRange.start.row, newRange.start.column);
					range.setEnd(newRange.end.row, newRange.end.column);
					editor.getSession().getSelection().setSelectionRange(range, false);
				} else {
					for (let i = 0; i < string1.length; i++) {
						editor.getSession().getSelection().moveCursorRight();
					}
				}
				editor.focus();
			}, 10);
		}

		aceEditor_change(newBody);
	}, [editor, props.content, aceEditor_change]);

	const addListItem = useCallback((string1, string2 = '', defaultText = '', byLine = false) => {
		let newLine = '\n';
		const range = selectionRange(editor);
		if (!range || (range.start.row === range.end.row && !selectionRangeCurrentLine(range, props.content))) {
			newLine = '';
		}
		wrapSelectionWithStrings(newLine + string1, string2, defaultText, null, byLine);
	}, [wrapSelectionWithStrings, props.content, editor]);

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
				if (!editor) return false;

				reg.logger().debug('AceEditor: execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'dropItems') {
					if (cmd.value.type === 'notes') {
						wrapSelectionWithStrings('', '', '', cmd.value.markdownTags.join('\n'));
					} else if (cmd.value.type === 'files') {
						const newBody = await commandAttachFileToBody(props.content, cmd.value.paths, { createFileURL: !!cmd.value.createFileURL });
						aceEditor_change(newBody);
					} else {
						reg.logger().warn('AceEditor: unsupported drop item: ', cmd);
					}
				} else if (cmd.name === 'focus') {
					editor.focus();
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
							const selection = textOffsetSelection(selectionRange(editor), props.content);
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
							const selection = textOffsetSelection(selectionRange(editor), props.content);
							const newBody = await commandAttachFileToBody(props.content, null, { position: selection ? selection.start : 0 });
							if (newBody) aceEditor_change(newBody);
						},
						textNumberedList: () => {
							const selection = selectionRange(editor);
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
						reg.logger().warn('AceEditor: unsupported Joplin command: ', cmd);
						return false;
					}
				}

				return true;
			},
		};
	}, [editor, props.content, addListItem, wrapSelectionWithStrings, selectionRangeCurrentLine, aceEditor_change, setEditorPercentScroll, setViewerPercentScroll, resetScroll, renderedBody]);

	const onEditorPaste = useCallback(async (event: any = null) => {
		const resourceMds = await handlePasteEvent(event);
		if (!resourceMds.length) return;
		wrapSelectionWithStrings('', '', resourceMds.join('\n'));
	}, [wrapSelectionWithStrings]);

	const onEditorKeyDown = useCallback((event: any) => {
		setLastKeys(prevLastKeys => {
			const keys = prevLastKeys.slice();
			keys.push(event.key);
			while (keys.length > 2) keys.splice(0, 1);
			return keys;
		});
	}, []);

	const editorCutText = useCallback(() => {
		const text = selectedText(selectionRange(editor), props.content);
		if (!text) return;

		clipboard.writeText(text);

		const s = textOffsetSelection(selectionRange(editor), props.content);
		if (!s || s.start === s.end) return;

		const s1 = props.content.substr(0, s.start);
		const s2 = props.content.substr(s.end);

		aceEditor_change(s1 + s2);

		setTimeout(() => {
			const range = selectionRange(editor);
			range.setStart(range.start.row, range.start.column);
			range.setEnd(range.start.row, range.start.column);
			editor.getSession().getSelection().setSelectionRange(range, false);
			editor.focus();
		}, 10);
	}, [props.content, editor, aceEditor_change]);

	const editorCopyText = useCallback(() => {
		const text = selectedText(selectionRange(editor), props.content);
		clipboard.writeText(text);
	}, [props.content, editor]);

	const editorPasteText = useCallback(() => {
		wrapSelectionWithStrings(clipboard.readText(), '', '', '');
	}, [wrapSelectionWithStrings]);

	const onEditorContextMenu = useCallback(() => {
		const menu = new Menu();

		const hasSelectedText = !!selectedText(selectionRange(editor), props.content);
		const clipboardText = clipboard.readText();

		menu.append(
			new MenuItem({
				label: _('Cut'),
				enabled: hasSelectedText,
				click: async () => {
					editorCutText();
				},
			}),
		);

		menu.append(
			new MenuItem({
				label: _('Copy'),
				enabled: hasSelectedText,
				click: async () => {
					editorCopyText();
				},
			}),
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
			}),
		);

		menu.popup(bridge().window());
	}, [props.content, editorCutText, editorPasteText, editorCopyText, onEditorPaste, editor]);

	function aceEditor_load(editor: any) {
		setEditor(editor);
	}

	useEffect(() => {
		if (!editor) return () => {};

		const cancelledKeys = [];
		const letters = ['F', 'T', 'P', 'Q', 'L', ',', 'G', 'K'];
		for (let i = 0; i < letters.length; i++) {
			const l = letters[i];
			cancelledKeys.push(`Ctrl+${l}`);
			cancelledKeys.push(`Command+${l}`);
		}
		cancelledKeys.push('Alt+E');
		cancelledKeys.push('Command+Shift+L');
		cancelledKeys.push('Ctrl+Shift+L');

		for (let i = 0; i < cancelledKeys.length; i++) {
			const k = cancelledKeys[i];
			editor.commands.bindKey(k, () => {
				// HACK: Ace doesn't seem to provide a way to override its shortcuts, but throwing
				// an exception from this undocumented function seems to cancel it without any
				// side effect.
				// https://stackoverflow.com/questions/36075846
				throw new Error(`HACK: Overriding Ace Editor shortcut: ${k}`);
			});
		}

		document.querySelector('#note-editor').addEventListener('paste', onEditorPaste, true);
		document.querySelector('#note-editor').addEventListener('keydown', onEditorKeyDown);
		document.querySelector('#note-editor').addEventListener('contextmenu', onEditorContextMenu);

		// Disable Markdown auto-completion (eg. auto-adding a dash after a line with a dash.
		// https://github.com/ajaxorg/ace/issues/2754
		// @ts-ignore: Keep the function signature as-is despite unusued arguments
		editor.getSession().getMode().getNextLineIndent = function(state: any, line: string) {
			const ls = lastKeys;
			if (ls.length >= 2 && ls[ls.length - 1] === 'Enter' && ls[ls.length - 2] === 'Enter') return this.$getIndent(line);

			const leftSpaces = lineLeftSpaces(line);
			const lineNoLeftSpaces = line.trimLeft();

			if (lineNoLeftSpaces.indexOf('- [ ] ') === 0 || lineNoLeftSpaces.indexOf('- [x] ') === 0 || lineNoLeftSpaces.indexOf('- [X] ') === 0) return `${leftSpaces}- [ ] `;
			if (lineNoLeftSpaces.indexOf('- ') === 0) return `${leftSpaces}- `;
			if (lineNoLeftSpaces.indexOf('* ') === 0 && line.trim() !== '* * *') return `${leftSpaces}* `;

			const bulletNumber = markdownUtils.olLineNumber(lineNoLeftSpaces);
			if (bulletNumber) return `${leftSpaces + (bulletNumber + 1)}. `;

			return this.$getIndent(line);
		};

		return () => {
			document.querySelector('#note-editor').removeEventListener('paste', onEditorPaste, true);
			document.querySelector('#note-editor').removeEventListener('keydown', onEditorKeyDown);
			document.querySelector('#note-editor').removeEventListener('contextmenu', onEditorContextMenu);
		};
	}, [editor, onEditorPaste, onEditorContextMenu, lastKeys]);

	useEffect(() => {
		// We disable dragging ot text because it's not really supported, and
		// can lead to data loss: https://github.com/laurent22/joplin/issues/3302
		if (editor) editor.setOption('dragEnabled', false);
	}, [editor]);

	const webview_domReady = useCallback(() => {
		setWebviewReady(true);
	}, []);

	const webview_ipcMessage = useCallback((event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, props.content);
			aceEditor_change(newBody);
		} else if (msg === 'percentScroll') {
			setEditorPercentScroll(arg0);
		} else {
			props.onMessage(event);
		}
	}, [props.onMessage, props.content, aceEditor_change, setEditorPercentScroll]);

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
		if (!editor) return;

		if (contentKeyHasChangedRef.current) {
			// editor.getSession().setMode(new CustomMdMode());
			const undoManager = editor.getSession().getUndoManager();
			undoManager.reset();
			editor.getSession().setUndoManager(undoManager);
		}
	}, [props.content, editor]);

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

	const { focused, onBlur, onFocus } = useFocus();

	const cellEditorStyle = useMemo(() => {
		const output = { ...styles.cellEditor };
		if (!props.visiblePanes.includes('editor')) {
			// Note: Ideally we'd set the display to "none" to take the editor out
			// of the DOM but if we do that, certain things won't work, in particular
			// things related to scroll, which are based on the editor.

			// Note that the below hack doesn't work and causes a bug in this case:
			// - Put Ace Editor in viewer-only mode
			// - Go to WYSIWYG editor
			// - Create new to-do - set title only
			// - Switch to Code View
			// - Switch layout and type something
			// => Text editor layout is broken and text is off-screen

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
		// Need to hard-code the editor width, otherwise various bugs pops up
		let width = 0;
		if (props.visiblePanes.includes('editor')) {
			width = !props.visiblePanes.includes('viewer') ? rootWidth : Math.floor(rootWidth / 2);
		}

		return (
			<div style={cellEditorStyle}>
				<AceEditorReact
					value={props.content}
					mode={props.contentMarkupLanguage === Note.MARKUP_LANGUAGE_HTML ? 'text' : 'markdown'}
					theme={styles.editor.editorTheme}
					onFocus={onFocus}
					onBlur={onBlur}
					style={styles.editor}
					width={`${width}px`}
					fontSize={styles.editor.fontSize}
					showGutter={false}
					readOnly={props.visiblePanes.indexOf('editor') < 0}
					name="note-editor"
					wrapEnabled={true}
					onScroll={editor_scroll}
					onChange={aceEditor_change}
					showPrintMargin={false}
					onLoad={aceEditor_load}
					// Enable/Disable the autoclosing braces
					setOptions={
						{
							behavioursEnabled: Setting.value('editor.autoMatchingBraces'),
							useSoftTabs: false,
						}
					}
					// Disable warning: "Automatically scrolling cursor into view after
					// selection change this will be disabled in the next version set
					// editor.$blockScrolling = Infinity to disable this message"
					editorProps={{ $blockScrolling: Infinity }}
					// This is buggy (gets outside the container)
					highlightActiveLine={false}
					keyboardHandler={props.keyboardMode}
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
					disabled={!focused}
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

export default forwardRef(AceEditor);

