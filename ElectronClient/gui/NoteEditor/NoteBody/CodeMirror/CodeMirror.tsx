import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { commandAttachFileToBody, handlePasteEvent } from '../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../utils/types';
import { useScrollHandler, usePrevious, cursorPositionToTextOffset, useRootSize } from './utils';
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
const { themeStyle } = require('lib/theme');

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
	const theme = themeStyle(props.theme);

	const rootSize = useRootSize({ rootRef });

	const { resetScroll, editor_scroll, setEditorPercentScroll, setViewerPercentScroll } = useScrollHandler(editorRef, webviewRef, props.onScroll);

	const codeMirror_change = useCallback((newBody: string) => {
		props_onChangeRef.current({ changeId: null, content: newBody });
	}, []);

	const wrapSelectionWithStrings = useCallback((string1: string, string2 = '', defaultText = '') => {
		if (!editorRef.current) return;

		if (editorRef.current.somethingSelected()) {
			editorRef.current.wrapSelections(string1, string2);
		} else {
			editorRef.current.wrapSelections(string1 + defaultText, string2);

			// Now select the default text so the user can replace it
			const selections = editorRef.current.listSelections();
			const newSelections = [];
			for (let i = 0; i < selections.length; i++) {
				const s = selections[i];
				const anchor = { line: s.anchor.line, ch: s.anchor.ch + string1.length };
				const head = { line: s.head.line, ch: s.head.ch - string2.length };
				newSelections.push({ anchor: anchor, head: head });
			}
			editorRef.current.setSelections(newSelections);
		}
		editorRef.current.focus();
	}, []);

	const addListItem = useCallback((string1, defaultText = '') => {
		if (editorRef.current) {
			if (editorRef.current.somethingSelected()) {
				editorRef.current.wrapSelectionsByLine(string1);
			} else if (editorRef.current.getCursor('anchor').ch !== 0) {
				editorRef.current.insertAtCursor(`\n${string1}`);
			} else {
				wrapSelectionWithStrings(string1, '', defaultText);
			}
			editorRef.current.focus();
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
					if (cmd.value.type === 'notes') {
						editorRef.current.insertAtCursor(cmd.value.markdownTags.join('\n'));
					} else if (cmd.value.type === 'files') {
						const pos = cursorPositionToTextOffset(editorRef.current.getCursor(), props.content);
						const newBody = await commandAttachFileToBody(props.content, cmd.value.paths, { createFileURL: !!cmd.value.createFileURL, position: pos });
						editorRef.current.updateBody(newBody);
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
						textItalic: () => wrapSelectionWithStrings('*', '*', _('emphasised text')),
						textLink: async () => {
							const url = await dialogs.prompt(_('Insert Hyperlink'));
							if (url) wrapSelectionWithStrings('[', `](${url})`);
						},
						textCode: () => {
							const selections = editorRef.current.getSelections();

							// This bases the selection wrapping only around the first element
							if (selections.length > 0) {
								const string = selections[0];

								// Look for newlines
								const match = string.match(/\r?\n/);

								if (match && match.length > 0) {
									wrapSelectionWithStrings(`\`\`\`${match[0]}`, `${match[0]}\`\`\``);
								} else {
									wrapSelectionWithStrings('`', '`', '');
								}
							}
						},
						insertText: (value: any) => editorRef.current.insertAtCursor(value),
						attachFile: async () => {
							const cursor = editorRef.current.getCursor();
							const pos = cursorPositionToTextOffset(cursor, props.content);

							const newBody = await commandAttachFileToBody(props.content, null, { position: pos });
							if (newBody) editorRef.current.updateBody(newBody);
						},
						textNumberedList: () => {
							let bulletNumber = markdownUtils.olLineNumber(editorRef.current.getCurrentLine());
							if (!bulletNumber) bulletNumber = markdownUtils.olLineNumber(editorRef.current.getPreviousLine());
							if (!bulletNumber) bulletNumber = 0;
							addListItem(`${bulletNumber + 1}. `, _('List item'));
						},
						textBulletedList: () => addListItem('- ', _('List item')),
						textCheckbox: () => addListItem('- [ ] ', _('List item')),
						textHeading: () => addListItem('## ', ''),
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
	}, [props.content, addListItem, wrapSelectionWithStrings, setEditorPercentScroll, setViewerPercentScroll, resetScroll, renderedBody]);

	const onEditorPaste = useCallback(async (event: any = null) => {
		const resourceMds = await handlePasteEvent(event);
		if (!resourceMds.length) return;
		if (editorRef.current) {
			editorRef.current.replaceSelection(resourceMds.join('\n'));
		}
	}, []);

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
		if (editorRef.current) {
			editorRef.current.replaceSelection(clipboard.readText());
		}
	}, []);

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

	useEffect(() => {
		const element = document.createElement('style');
		element.setAttribute('id', 'codemirrorStyle');
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(`
			/* These must be important to prevent the codemirror defaults from taking over*/
			.CodeMirror {
				font-family: monospace;
				height: 100% !important;
				width: 100% !important;
				color: inherit !important;
				background-color: inherit !important;
				position: absolute !important;
				-webkit-box-shadow: none !important; // Some themes add a box shadow for some reason
			}
			
			.cm-header-1 {
				font-size: 1.5em;
			}
			
			.cm-header-2 {
				font-size: 1.3em;
			}
			
			.cm-header-3 {
				font-size: 1.1em;
			}
			
			.cm-header-4, .cm-header-5, .cm-header-6 {
				font-size: 1em;
			}
			
			.cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6 {
				line-height: 1.5em;
			}
			
			.cm-search-marker {
				background: ${theme.searchMarkerBackgroundColor};
				color: ${theme.searchMarkerColor} !important;
			}
			
			.cm-search-marker-selected {
				background: ${theme.selectedColor2};
				color: ${theme.color2} !important;
			}
			
			.cm-search-marker-scrollbar {
				background: ${theme.searchMarkerBackgroundColor};
				-moz-box-sizing: border-box;
				box-sizing: border-box;
				opacity: .5;
			}
		`));

		return () => {
			document.head.removeChild(element);
		};
	}, [props.theme]);

	const webview_domReady = useCallback(() => {
		setWebviewReady(true);
	}, []);

	const webview_ipcMessage = useCallback((event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, props.content);
			if (editorRef.current) {
				editorRef.current.updateBody(newBody);
			}
		} else if (msg === 'percentScroll') {
			setEditorPercentScroll(arg0);
		} else {
			props.onMessage(event);
		}
	}, [props.onMessage, props.content, setEditorPercentScroll]);

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
			// Force both viewers to be visible during search
			// This view should only change when the search terms change, this means the user
			// is always presented with the currently highlighted text, but can revert
			// to the viewer if they only want to scroll through matches
			if (!props.visiblePanes.includes('editor') && props.searchMarkers !== previousSearchMarkers) {
				props.dispatch({
					type: 'NOTE_VISIBLE_PANES_SET',
					panes: ['editor', 'viewer'],
				});
			}
			// SEARCHHACK
			// TODO: remove this options hack when aceeditor is removed
			// Currently the webviewRef will send out an ipcMessage to set the results count
			// Also setting it here will start an infinite loop of repeating the search
			// Unfortunately we can't remove the function in the webview setMarkers
			// until the aceeditor is remove.
			// The below search is more accurate than the webview based one as it searches
			// the text and not rendered html (rendered html fails if there is a match
			// in a katex block)
			// Once AceEditor is removed the options definition below can be removed and
			// props.searchMarkers.options can be directly passed to as the 3rd argument below
			// (replacing options)
			let options = { notFromAce: true };
			if (props.searchMarkers.options) {
				options = Object.assign({}, props.searchMarkers.options, options);
			}
			webviewRef.current.wrappedInstance.send('setMarkers', props.searchMarkers.keywords, options);
			//  SEARCHHACK
			if (editorRef.current) {

				const matches = editorRef.current.setMarkers(props.searchMarkers.keywords, props.searchMarkers.options);
				props.setLocalSearchResultCount(matches);
			}
		}
	}, [props.searchMarkers, props.setLocalSearchResultCount, renderedBody]);

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

	// The editor needs to be kept up to date on the actual space that it's filling
	// Ogherwise we can get some rendering errors when the editor size is changed
	// (this can happen when switching layout of when toggling sidebars for example)
	const editorStyle = useMemo(() => {
		const output = Object.assign({}, rootSize, styles.editor);

		if (props.visiblePanes.includes('editor') && props.visiblePanes.includes('viewer')) {
			output.width = Math.floor(rootSize.width / 2);
		}

		return output;
	}, [rootSize, styles.editor, props.visiblePanes]);

	const editorReadOnly = props.visiblePanes.indexOf('editor') < 0;

	function renderEditor() {

		return (
			<div style={cellEditorStyle}>
				<Editor
					value={props.content}
					ref={editorRef}
					mode={props.contentMarkupLanguage === Note.MARKUP_LANGUAGE_HTML ? 'xml' : 'joplin-markdown'}
					theme={styles.editor.codeMirrorTheme}
					style={editorStyle}
					readOnly={props.visiblePanes.indexOf('editor') < 0}
					autoMatchBraces={Setting.value('editor.autoMatchingBraces')}
					keyMap={props.keyboardMode}
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
					disabled={editorReadOnly}
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

