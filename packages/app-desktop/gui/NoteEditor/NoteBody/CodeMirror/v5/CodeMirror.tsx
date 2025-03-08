import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, ForwardedRef, useContext } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps, NoteBodyEditorRef } from '../../../utils/types';
import { commandAttachFileToBody, getResourcesFromPasteEvent } from '../../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../../utils/types';
import { CommandValue } from '../../../utils/types';
import { cursorPositionToTextOffset } from '../utils';
import useScrollHandler from '../utils/useScrollHandler';
import useElementSize from '@joplin/lib/hooks/useElementSize';
import Toolbar from '../Toolbar';
import { RenderedBody, defaultRenderedBody } from '../utils/types';
import NoteTextViewer from '../../../../NoteTextViewer';
import Editor from './Editor';
import usePluginServiceRegistration from '../../../utils/usePluginServiceRegistration';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../../../services/bridge';
import markdownUtils from '@joplin/lib/markdownUtils';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { ThemeAppearance } from '@joplin/lib/themes/type';
import dialogs from '../../../../dialogs';
import { MarkupToHtml } from '@joplin/renderer';
const { clipboard } = require('electron');

import { reg } from '@joplin/lib/registry';
import ErrorBoundary from '../../../../ErrorBoundary';
import useStyles from '../utils/useStyles';
import useContextMenu from '../utils/useContextMenu';
import useWebviewIpcMessage from '../utils/useWebviewIpcMessage';
import useEditorSearchHandler from '../utils/useEditorSearchHandler';
import { focus } from '@joplin/lib/utils/focusHandler';
import { WindowIdContext } from '../../../../NewWindowOrIFrame';
import { MarkupToHtmlOptions } from '../../../../hooks/useMarkupToHtml';

function markupRenderOptions(override: MarkupToHtmlOptions = null): MarkupToHtmlOptions {
	return { ...override };
}

function CodeMirror(props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) {
	const styles = useStyles(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [renderedBodyContentKey, setRenderedBodyContentKey] = useState<string>(null);

	const [webviewReady, setWebviewReady] = useState(false);

	const editorRef = useRef(null);
	const [editorRoot, setEditorRoot] = useState<HTMLDivElement|null>(null);
	const rootRef = useRef<HTMLDivElement|null>(null);
	rootRef.current = editorRoot;

	const webviewRef = useRef(null);
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const props_onChangeRef = useRef<Function>(null);
	props_onChangeRef.current = props.onChange;

	const rootSize = useElementSize(rootRef);

	usePluginServiceRegistration(ref);

	const { resetScroll, editor_scroll, setEditorPercentScroll, setViewerPercentScroll, editor_resize, editor_update, getLineScrollPercent,
	} = useScrollHandler(editorRef, webviewRef, props.onScroll);

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
	}, []);

	const addListItem = useCallback((string1: string, defaultText = '') => {
		if (editorRef.current) {
			if (editorRef.current.somethingSelected()) {
				editorRef.current.wrapSelectionsByLine(string1);
			} else if (editorRef.current.getCursor('anchor').ch !== 0) {
				editorRef.current.insertAtCursor(`\n${string1}`);
			} else {
				wrapSelectionWithStrings(string1, '', defaultText);
			}
		}
	}, [wrapSelectionWithStrings]);

	useImperativeHandle(ref, () => {
		return {
			content: () => props.content,
			resetScroll: () => {
				resetScroll();
			},
			scrollTo: (options: ScrollOptions) => {
				if (options.type === ScrollOptionTypes.Hash) {
					if (!webviewRef.current) return;
					webviewRef.current.send('scrollToHash', options.value as string);
				} else if (options.type === ScrollOptionTypes.Percent) {
					const percent = options.value as number;
					setEditorPercentScroll(percent);
					setViewerPercentScroll(percent);
				} else {
					throw new Error(`Unsupported scroll options: ${options.type}`);
				}
			},
			supportsCommand: (/* name:string*/) => {
				// TODO: not implemented, currently only used for "search" command
				// which is not directly supported by this Editor.
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
						const newBody = await commandAttachFileToBody(props.content, cmd.value.paths, {
							createFileURL: !!cmd.value.createFileURL,
							position: pos,
							markupLanguage: props.contentMarkupLanguage,
						});
						editorRef.current.updateBody(newBody);
					} else {
						reg.logger().warn('CodeMirror: unsupported drop item: ', cmd);
					}
				} else if (cmd.name === 'editor.focus') {
					if (props.visiblePanes.indexOf('editor') >= 0) {
						focus('v5/CodeMirror::editor.focus', editorRef.current);
					} else {
						// If we just call focus() then the iframe is focused,
						// but not its content, such that scrolling up / down
						// with arrow keys fails
						webviewRef.current.send('focus');
					}
				} else {
					commandProcessed = false;
				}

				let commandOutput = null;

				if (!commandProcessed) {
					const selectedText = () => {
						if (!editorRef.current) return '';
						const selections = editorRef.current.getSelections();
						return selections.length ? selections[0] : '';
					};

					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					const commands: any = {
						selectedText: () => {
							return selectedText();
						},
						selectedHtml: () => {
							return selectedText();
						},
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						replaceSelection: (value: any) => {
							return editorRef.current.replaceSelection(value);
						},
						textCopy: () => {
							editorCopyText();
						},
						textCut: () => {
							editorCutText();
						},
						textPaste: () => {
							editorPaste();
						},
						textSelectAll: () => {
							return editorRef.current.execCommand('selectAll');
						},
						textBold: () => wrapSelectionWithStrings('**', '**', _('strong text')),
						textItalic: () => wrapSelectionWithStrings('*', '*', _('emphasised text')),
						textLink: async () => {
							const url = await dialogs.prompt(_('Insert Hyperlink'));
							focus('v5/CodeMirror::textLink', editorRef.current);
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
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						insertText: (value: any) => editorRef.current.insertAtCursor(value),
						attachFile: async () => {
							const cursor = editorRef.current.getCursor();
							const pos = cursorPositionToTextOffset(cursor, props.content);

							const newBody = await commandAttachFileToBody(props.content, null, { position: pos, markupLanguage: props.contentMarkupLanguage });
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
						'editor.execCommand': (value: CommandValue) => {
							if (!('args' in value)) value.args = [];

							if (editorRef.current[value.name]) {
								const result = editorRef.current[value.name](...value.args);
								return result;
							} else if (editorRef.current.commandExists(value.name)) {
								const result = editorRef.current.execCommand(value.name);
								return result;
							} else {
								reg.logger().warn('CodeMirror execCommand: unsupported command: ', value.name);
							}
						},
						'editor.scrollToText': (_text: string) => {
							reg.logger().warn('"editor.scrollToText" is unsupported in legacy editor - please use the new editor');
							return false;
						},
					};

					if (commands[cmd.name]) {
						commandOutput = commands[cmd.name](cmd.value);
					} else if (await editorRef.current.supportsCommand(cmd)) {
						commandOutput = editorRef.current.execCommandFromJoplin(cmd);
					} else {
						reg.logger().warn('CodeMirror: unsupported Joplin command: ', cmd);
					}
				}

				return commandOutput;
			},
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.content, props.visiblePanes, props.contentMarkupLanguage, addListItem, wrapSelectionWithStrings, setEditorPercentScroll, setViewerPercentScroll, resetScroll]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onEditorPaste = useCallback(async (event: any = null) => {
		const resourceMds = await getResourcesFromPasteEvent(event);
		if (!resourceMds.length) return;
		if (editorRef.current) {
			editorRef.current.replaceSelection(resourceMds.join('\n'));
		}
	}, []);

	const editorCutText = useCallback(() => {
		if (editorRef.current) {
			const selections = editorRef.current.getSelections();
			if (selections.length > 0 && selections[0]) {
				clipboard.writeText(selections[0]);
				// Easy way to wipe out just the first selection
				selections[0] = '';
				editorRef.current.replaceSelections(selections);
			} else {
				const cursor = editorRef.current.getCursor();
				const line = editorRef.current.getLine(cursor.line);
				clipboard.writeText(`${line}\n`);
				const startLine = editorRef.current.getCursor('head');
				startLine.ch = 0;
				const endLine = {
					line: startLine.line + 1,
					ch: 0,
				};
				editorRef.current.replaceRange('', startLine, endLine);
			}
		}
	}, []);

	const editorCopyText = useCallback(() => {
		if (editorRef.current) {
			const selections = editorRef.current.getSelections();


			// Handle the case when there is a selection - copy the selection to the clipboard
			// When there is no selection, the selection array contains an empty string.
			if (selections.length > 0 && selections[0]) {
				clipboard.writeText(selections[0]);
			} else {
				// This is the case when there is no selection - copy the current line to the clipboard
				const cursor = editorRef.current.getCursor();
				const line = editorRef.current.getLine(cursor.line);
				clipboard.writeText(line);
			}
		}
	}, []);

	const editorPasteText = useCallback(async () => {
		if (editorRef.current) {
			const modifiedMd = await Note.replaceResourceExternalToInternalLinks(clipboard.readText(), { useAbsolutePaths: true });
			editorRef.current.replaceSelection(modifiedMd);
		}
	}, []);

	const editorPaste = useCallback(() => {
		const clipboardText = clipboard.readText();

		if (clipboardText) {
			void editorPasteText();
		} else {
			// To handle pasting images
			void onEditorPaste();
		}
	}, [editorPasteText, onEditorPaste]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const loadScript = async (script: any) => {
		return new Promise((resolve) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let element: any = document.createElement('script');
			if (script.src.indexOf('.css') >= 0) {
				element = document.createElement('link');
				element.rel = 'stylesheet';
				element.href = script.src;
			} else {
				element.src = script.src;

				if (script.attrs) {
					for (const attr in script.attrs) {
						element[attr] = script.attrs[attr];
					}
				}
			}

			element.id = script.id;

			element.onload = () => {
				resolve(null);
			};

			document.getElementsByTagName('head')[0].appendChild(element);
		});
	};

	useEffect(() => {
		let cancelled = false;

		async function loadScripts() {
			const scriptsToLoad: { src: string; id: string; loaded: boolean }[] = [
				{
					src: `${bridge().vendorDir()}/lib/codemirror/addon/dialog/dialog.css`,
					id: 'codemirrorDialogStyle',
					loaded: false,
				},
			];

			// The default codemirror theme is defined in codemirror.css
			// and doesn't have an extra css file
			if (styles.editor.codeMirrorTheme !== 'default') {
				// Solarized light and solarized dark are loaded by the single
				// solarized.css file
				let theme = styles.editor.codeMirrorTheme;
				if (theme.indexOf('solarized') >= 0) theme = 'solarized';

				scriptsToLoad.push({
					src: `${bridge().vendorDir()}/lib/codemirror/theme/${theme}.css`,
					id: `codemirrorTheme${theme}`,
					loaded: false,
				});
			}

			for (const s of scriptsToLoad) {
				if (document.getElementById(s.id)) {
					s.loaded = true;
					continue;
				}

				await loadScript(s);
				if (cancelled) return;

				s.loaded = true;
			}
		}

		void loadScripts();

		return () => {
			cancelled = true;
		};
	}, [styles.editor.codeMirrorTheme]);

	useEffect(() => {
		if (!editorRoot) return () => {};

		const theme = themeStyle(props.themeId);

		// Selection in dark mode is hard to see so make it brighter.
		// https://discourse.joplinapp.org/t/dragging-in-dark-theme/12433/4?u=laurent
		const selectionColorCss = theme.appearance === ThemeAppearance.Dark ?
			`.CodeMirror-selected {
				background: #6b6b6b !important;
			}` : '';
		// Vim mode draws a fat cursor in the background, we don't want to add background colors
		// to the inline code in this case (it would hide the cursor)
		const codeBackgroundColor = Setting.value('editor.keyboardMode') !== 'vim' ? theme.codeBackgroundColor : 'inherit';
		const monospaceFonts = [];
		if (Setting.value('style.editor.monospaceFontFamily')) monospaceFonts.push(`"${Setting.value('style.editor.monospaceFontFamily')}"`);
		monospaceFonts.push('monospace');

		const maxWidthCss = props.contentMaxWidth ? `
			margin-right: auto !important;
			margin-left: auto !important;
			max-width: ${props.contentMaxWidth}px !important;
		` : '';

		const ownerDoc = editorRoot.ownerDocument;
		const element = ownerDoc.createElement('style');
		element.setAttribute('id', 'codemirrorStyle');
		ownerDoc.head.appendChild(element);
		element.appendChild(ownerDoc.createTextNode(`
			/* These must be important to prevent the codemirror defaults from taking over*/
			.CodeMirror {
				font-family: monospace;
				font-size: ${props.fontSize}px;
				height: 100% !important;
				width: 100% !important;
				color: inherit !important;
				background-color: inherit !important;
				position: absolute !important;
				/* Some themes add a box shadow for some reason */
				-webkit-box-shadow: none !important;
				line-height: ${theme.lineHeight} !important;
			}

			.CodeMirror-code:focus-visible {
				/* Avoid showing additional focus-visible decoration */
				outline: none;
			}

			.CodeMirror-lines {
				/* This is used to enable the scroll-past end behaviour. The same height should */
				/* be applied to the viewer. */
				padding-bottom: 400px !important;
			}

			/* Left padding is applied at the editor component level, so we should remove it from the lines */
			.CodeMirror pre.CodeMirror-line,
			.CodeMirror pre.CodeMirror-line-like {
				padding-left: 0;
			}

			.CodeMirror-sizer {
				/* Add a fixed right padding to account for the appearance (and disappearance) */
				/* of the sidebar */
				padding-right: 10px !important;
				${maxWidthCss}
			}

			/* This enforces monospace for certain elements (code, tables, etc.) */
			.cm-jn-monospace {
				font-family: ${monospaceFonts.join(', ')} !important;
			}

			div.CodeMirror span.cm-header-1 {
				font-size: 1.5em;
				color: ${theme.color};
			}

			div.CodeMirror span.cm-header-2 {
				font-size: 1.3em;
				color: ${theme.color};
			}

			div.CodeMirror span.cm-header-3 {
				font-size: 1.1em;
				color: ${theme.color};
			}

			div.CodeMirror span.cm-header-4, div.CodeMirror span.cm-header-5, div.CodeMirror span.cm-header-6 {
				font-size: 1em;
				color: ${theme.color};
			}

			div.CodeMirror span.cm-variable-2, div.CodeMirror span.cm-variable-3, div.CodeMirror span.cm-keyword {
				color: ${theme.color};
			}

			div.CodeMirror span.cm-quote {
				color: ${theme.color};
				opacity: ${theme.blockQuoteOpacity};
			}

			div.CodeMirror span.cm-link-text {
				color: ${theme.urlColor};
			}

			div.CodeMirror span.cm-url {
				color: ${theme.urlColor};
				opacity: 0.5;
			}

			div.CodeMirror span.cm-comment {
				color: ${theme.codeColor};
			}

			/* Negative margins are needed to compensate for the border */
			div.CodeMirror span.cm-comment.cm-jn-inline-code:not(.cm-search-marker):not(.cm-fat-cursor-mark):not(.cm-search-marker-selected):not(.CodeMirror-selectedtext) {
				border: 1px solid ${theme.codeBorderColor};
				background-color: ${codeBackgroundColor};
				margin-left: -1px;
				margin-right: -1px;
				border-radius: .25em;
			}

			div.CodeMirror div.cm-jn-code-block-background {
				background-color: ${theme.codeBackgroundColor};
				padding-right: .2em;
				padding-left: .2em;
			}

			div.CodeMirror span.cm-hr {
				color: ${theme.dividerColor};
			}

			.cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6 {
				line-height: 1.5em;
			}

			.cm-search-marker {
				background: ${theme.searchMarkerBackgroundColor};
				color: ${theme.searchMarkerColor} !important;
			}

			/* We need !important because the search marker is overridden by CodeMirror's own text selection marker */
			.cm-search-marker-selected {
				background: ${theme.selectedColor2} !important;
				color: ${theme.color2} !important;
			}

			.cm-search-marker-scrollbar {
				background: ${theme.searchMarkerBackgroundColor};
				-moz-box-sizing: border-box;
				box-sizing: border-box;
				opacity: .5;
			}

			/* We need to use important to override theme specific values */
			.cm-error {
				color: inherit !important;
				background-color: inherit !important;
				border-bottom: 1px dotted #dc322f;
			}

			/* The default dark theme colors don't have enough contrast with the background */

			/*
			.cm-s-nord span.cm-comment {
				color: #9aa4b6 !important;
			}

			.cm-s-dracula span.cm-comment {
				color: #a1abc9 !important;
			}

			.cm-s-monokai span.cm-comment {
				color: #908b74 !important;
			}

			.cm-s-material-darker span.cm-comment {
				color: #878787 !important;
			}

			.cm-s-solarized.cm-s-dark span.cm-comment {
				color: #8ba1a7 !important;
			}
			*/

			${selectionColorCss}
		`));

		return () => {
			ownerDoc.head.removeChild(element);
		};
	}, [props.themeId, props.contentMaxWidth, props.fontSize, editorRoot]);

	const webview_domReady = useCallback(() => {
		setWebviewReady(true);
	}, []);

	const webview_ipcMessage = useWebviewIpcMessage({
		editorRef,
		setEditorPercentScroll,
		getLineScrollPercent,
		content: props.content,
		onMessage: props.onMessage,
	});

	useEffect(() => {
		let cancelled = false;

		// When a new note is loaded (contentKey is different), we want the note to be displayed
		// right away. However once that's done, we put a small delay so that the view is not
		// being constantly updated while the user changes the note.
		const interval = renderedBodyContentKey !== props.contentKey ? 0 : 500;

		const timeoutId = shim.setTimeout(async () => {
			let bodyToRender = props.content;

			if (!props.visiblePanes.includes('viewer')) {
				return;
			}

			if (!bodyToRender.trim() && props.visiblePanes.indexOf('viewer') >= 0 && props.visiblePanes.indexOf('editor') < 0) {
				// Fixes https://github.com/laurent22/joplin/issues/217
				bodyToRender = `<i>${_('This note has no content. Click on "%s" to toggle the editor and edit the note.', _('Layout'))}</i>`;
			}

			const result = await props.markupToHtml(props.contentMarkupLanguage, bodyToRender, markupRenderOptions({
				resourceInfos: props.resourceInfos,
				contentMaxWidth: props.contentMaxWidth,
				mapsToLine: true,
				useCustomPdfViewer: props.useCustomPdfViewer,
				noteId: props.noteId,
				vendorDir: bridge().vendorDir(),
			}));

			if (cancelled) return;

			setRenderedBody(result);

			// Since we set `renderedBodyContentKey` here, it means this effect is going to
			// be triggered again, but that's hard to avoid and the second call would be cheap
			// anyway since the renderered markdown is cached by MdToHtml. We could use a ref
			// to avoid this, but a second rendering might still happens anyway to render images,
			// resources, or for other reasons. So it's best to focus on making any second call
			// to this effect as cheap as possible with caching, etc.
			setRenderedBodyContentKey(props.contentKey);
		}, interval);

		return () => {
			cancelled = true;
			shim.clearTimeout(timeoutId);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.content, props.contentKey, renderedBodyContentKey, props.contentMarkupLanguage, props.visiblePanes, props.resourceInfos, props.markupToHtml]);

	useEffect(() => {
		if (!webviewReady) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const options: any = {
			pluginAssets: renderedBody.pluginAssets,
			downloadResources: Setting.value('sync.resourceDownloadMode'),
			markupLineCount: editorRef.current?.lineCount() || 0,
		};

		// It seems when there's an error immediately when the component is
		// mounted, webviewReady might be true, but webviewRef.current will be
		// undefined. Maybe due to the error boundary that unmount components.
		// Since we can't do much about it we just print an error.
		if (webviewRef.current) {
			// To keep consistency among CodeMirror's editing and scroll percents
			// of Editor and Viewer.
			const percent = getLineScrollPercent();
			setEditorPercentScroll(percent);
			options.percent = percent;
			webviewRef.current.setHtml(renderedBody.html, options);
		} else {
			console.error('Trying to set HTML on an undefined webview ref');
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [renderedBody, webviewReady]);

	useEditorSearchHandler({
		setLocalSearchResultCount: props.setLocalSearchResultCount,
		searchMarkers: props.searchMarkers,
		webviewRef,
		editorRef,
		noteContent: props.content,
		renderedBody,
		showEditorMarkers: true,
	});

	useEffect(() => {
		if (!editorRef.current) return;

		// Need to let codemirror know that it's container's size has changed so that it can
		// re-compute anything it needs to. This ensures the cursor (and anything that is
		// based on window size will be correct
		// Codemirror will automatically refresh on window size changes but otherwise assumes
		// that it's container size is stable, that is not true with Joplin, hence
		// why we need to manually let codemirror know about resizes.
		// Manually calling refresh here will cause a double refresh in some instances (when the
		// window size is changed for example) but this is a fairly quick operation so it's worth
		// it.
		editorRef.current.refresh();
	}, [rootSize, styles.editor, props.visiblePanes]);

	useContextMenu({
		plugins: props.plugins,
		editorCutText, editorCopyText, editorPaste,
		editorRef,
		editorClassName: 'codeMirrorEditor',
		containerRef: rootRef,
	});

	function renderEditor() {

		const matchBracesOptions = Setting.value('editor.autoMatchingBraces') ? { override: true, pairs: '``()[]{}\'\'""‘’“”（）《》「」『』【】〔〕〖〗〘〙〚〛' } : false;

		return (
			<div className='editor'>
				<Editor
					value={props.content}
					searchMarkers={props.searchMarkers}
					ref={editorRef}
					mode={props.contentMarkupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML ? 'xml' : 'joplin-markdown'}
					codeMirrorTheme={styles.editor.codeMirrorTheme}
					style={styles.editor}
					readOnly={props.disabled || props.visiblePanes.indexOf('editor') < 0}
					autoMatchBraces={matchBracesOptions}
					keyMap={props.keyboardMode}
					plugins={props.plugins}
					onChange={codeMirror_change}
					onScroll={editor_scroll}
					onEditorPaste={onEditorPaste}
					isSafeMode={props.isSafeMode}
					onResize={editor_resize}
					onUpdate={editor_update}
				/>
			</div>
		);
	}

	function renderViewer() {
		return (
			<div className='viewer'>
				<NoteTextViewer
					ref={webviewRef}
					themeId={props.themeId}
					viewerStyle={styles.viewer}
					onIpcMessage={webview_ipcMessage}
					onDomReady={webview_domReady}
					contentMaxWidth={props.contentMaxWidth}
				/>
			</div>
		);
	}

	const editorViewerRow = (
		<div className={[
			'note-editor-viewer-row',
			props.visiblePanes.includes('editor') ? '-show-editor' : '',
			props.visiblePanes.includes('viewer') ? '-show-viewer' : '',
		].join(' ')}>
			{renderEditor()}
			{renderViewer()}
		</div>
	);

	const windowId = useContext(WindowIdContext);
	return (
		<ErrorBoundary message="The text editor encountered a fatal error and could not continue. The error might be due to a plugin, so please try to disable some of them and try again.">
			<div style={styles.root} ref={setEditorRoot}>
				<div style={styles.rowToolbar}>
					<Toolbar themeId={props.themeId} windowId={windowId}/>
					{props.noteToolbar}
				</div>
				{editorViewerRow}
			</div>
		</ErrorBoundary>
	);
}

export default forwardRef(CodeMirror);
