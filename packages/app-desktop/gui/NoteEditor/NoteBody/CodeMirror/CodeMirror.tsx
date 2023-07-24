import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { commandAttachFileToBody, handlePasteEvent } from '../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../utils/types';
import { CommandValue } from '../../utils/types';
import { usePrevious, cursorPositionToTextOffset } from './utils';
import useScrollHandler from './utils/useScrollHandler';
import useElementSize from '@joplin/lib/hooks/useElementSize';
import Toolbar from './Toolbar';
import styles_ from './styles';
import { RenderedBody, defaultRenderedBody } from './utils/types';
import NoteTextViewer from '../../../NoteTextViewer';
import Editor from './Editor';
import usePluginServiceRegistration from '../../utils/usePluginServiceRegistration';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../../services/bridge';
import markdownUtils from '@joplin/lib/markdownUtils';
import shim from '@joplin/lib/shim';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import { themeStyle } from '@joplin/lib/theme';
import { ThemeAppearance } from '@joplin/lib/themes/type';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import dialogs from '../../../dialogs';
import convertToScreenCoordinates from '../../../utils/convertToScreenCoordinates';
import { MarkupToHtml } from '@joplin/renderer';
const { clipboard } = require('electron');
const debounce = require('debounce');
import shared from '@joplin/lib/components/shared/note-screen-shared';
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
import { reg } from '@joplin/lib/registry';
import ErrorBoundary from '../../../ErrorBoundary';
import { MarkupToHtmlOptions } from '../../utils/useMarkupToHtml';
import eventManager from '@joplin/lib/eventManager';
import { EditContextMenuFilterObject } from '@joplin/lib/services/plugins/api/JoplinWorkspace';
import type { ContextMenuEvent, ContextMenuParams } from 'electron';

const menuUtils = new MenuUtils(CommandService.instance());

function markupRenderOptions(override: MarkupToHtmlOptions = null): MarkupToHtmlOptions {
	return { ...override };
}

function CodeMirror(props: NoteBodyEditorProps, ref: any) {
	const styles = styles_(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [renderedBodyContentKey, setRenderedBodyContentKey] = useState<string>(null);

	const [webviewReady, setWebviewReady] = useState(false);

	const previousContent = usePrevious(props.content);
	const previousRenderedBody = usePrevious(renderedBody);
	const previousSearchMarkers = usePrevious(props.searchMarkers);

	const editorRef = useRef(null);
	const rootRef = useRef(null);
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

	const addListItem = useCallback((string1, defaultText = '') => {
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
						const newBody = await commandAttachFileToBody(props.content, cmd.value.paths, { createFileURL: !!cmd.value.createFileURL, position: pos });
						editorRef.current.updateBody(newBody);
					} else {
						reg.logger().warn('CodeMirror: unsupported drop item: ', cmd);
					}
				} else if (cmd.name === 'editor.focus') {
					if (props.visiblePanes.indexOf('editor') >= 0) {
						editorRef.current.focus();
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

					const commands: any = {
						selectedText: () => {
							return selectedText();
						},
						selectedHtml: () => {
							return selectedText();
						},
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
							editorRef.current.focus();
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
					};

					if (commands[cmd.name]) {
						commandOutput = commands[cmd.name](cmd.value);
					} else if (editorRef.current.supportsCommand(cmd)) {
						commandOutput = editorRef.current.execCommandFromJoplin(cmd);
					} else {
						reg.logger().warn('CodeMirror: unsupported Joplin command: ', cmd);
					}
				}

				return commandOutput;
			},
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.content, props.visiblePanes, addListItem, wrapSelectionWithStrings, setEditorPercentScroll, setViewerPercentScroll, resetScroll]);

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

	const loadScript = async (script: any) => {
		return new Promise((resolve) => {
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

		const element = document.createElement('style');
		element.setAttribute('id', 'codemirrorStyle');
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(`
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

			/* Negative margins are needed to componsate for the border */
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
			document.head.removeChild(element);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.themeId, props.contentMaxWidth]);

	const webview_domReady = useCallback(() => {
		setWebviewReady(true);
	}, []);

	const webview_ipcMessage = useCallback((event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg.indexOf('checkboxclick:') === 0) {
			const { line, from, to } = shared.toggleCheckboxRange(msg, props.content);
			if (editorRef.current) {
				// To cancel CodeMirror's layout drift, the scroll position
				// is recorded before updated, and then it is restored.
				// Ref. https://github.com/laurent22/joplin/issues/5890
				const percent = getLineScrollPercent();
				editorRef.current.replaceRange(line, from, to);
				setEditorPercentScroll(percent);
			}
		} else if (msg === 'percentScroll') {
			const percent = arg0;
			setEditorPercentScroll(percent);
		} else {
			props.onMessage(event);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.onMessage, props.content, setEditorPercentScroll]);

	useEffect(() => {
		let cancelled = false;

		// When a new note is loaded (contentKey is different), we want the note to be displayed
		// right away. However once that's done, we put a small delay so that the view is not
		// being constantly updated while the user changes the note.
		const interval = renderedBodyContentKey !== props.contentKey ? 0 : 500;

		const timeoutId = shim.setTimeout(async () => {
			let bodyToRender = props.content;

			if (!bodyToRender.trim() && props.visiblePanes.indexOf('viewer') >= 0 && props.visiblePanes.indexOf('editor') < 0) {
				// Fixes https://github.com/laurent22/joplin/issues/217
				bodyToRender = `<i>${_('This note has no content. Click on "%s" to toggle the editor and edit the note.', _('Layout'))}</i>`;
			}

			const result = await props.markupToHtml(props.contentMarkupLanguage, bodyToRender, markupRenderOptions({
				resourceInfos: props.resourceInfos,
				contentMaxWidth: props.contentMaxWidth,
				mapsToLine: true,
				// Always using useCustomPdfViewer for now, we can add a new setting for it in future if we need to.
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
			webviewRef.current.send('setHtml', renderedBody.html, options);
		} else {
			console.error('Trying to set HTML on an undefined webview ref');
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [renderedBody, webviewReady]);

	useEffect(() => {
		if (!props.searchMarkers) return () => {};

		// If there is a currently active search, it's important to re-search the text as the user
		// types. However this is slow for performance so we ONLY want it to happen when there is
		// a search

		// Note that since the CodeMirror component also needs to handle the viewer pane, we need
		// to check if the rendered body has changed too (it will be changed with a delay after
		// props.content has been updated).
		const textChanged = props.searchMarkers.keywords.length > 0 && (props.content !== previousContent || renderedBody !== previousRenderedBody);

		if (webviewRef.current && (props.searchMarkers !== previousSearchMarkers || textChanged)) {
			webviewRef.current.send('setMarkers', props.searchMarkers.keywords, props.searchMarkers.options);

			if (editorRef.current) {
				// Fixes https://github.com/laurent22/joplin/issues/7565
				const debouncedMarkers = debounce(() => {
					const matches = editorRef.current.setMarkers(props.searchMarkers.keywords, props.searchMarkers.options);

					props.setLocalSearchResultCount(matches);
				}, 50);
				debouncedMarkers();
				return () => {
					debouncedMarkers.clear();
				};
			}
		}
		return () => {};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.searchMarkers, previousSearchMarkers, props.setLocalSearchResultCount, props.content, previousContent, renderedBody, previousRenderedBody, renderedBody]);

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

	const editorPaneVisible = props.visiblePanes.indexOf('editor') >= 0;

	useEffect(() => {
		if (!editorRef.current) return;

		// Anytime the user toggles the visible panes AND the editor is visible as a result
		// we should focus the editor
		// The intuition is that a panel toggle (with editor in view) is the equivalent of
		// an editor interaction so users should expect the editor to be focused
		if (editorPaneVisible) {
			editorRef.current.focus();
		}
	}, [editorPaneVisible]);

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

	// The below code adds support for spellchecking when it is enabled
	// It might be buggy, refer to the below issue
	// https://github.com/laurent22/joplin/pull/3974#issuecomment-718936703
	useEffect(() => {
		function pointerInsideEditor(params: ContextMenuParams) {
			const x = params.x, y = params.y, isEditable = params.isEditable, inputFieldType = params.inputFieldType;
			const elements = document.getElementsByClassName('codeMirrorEditor');

			// inputFieldType: The input field type of CodeMirror is "textarea" so the
			// inputFieldType = "plainText".
			//
			// This isn't perfect because single-line inputs also have type plainText. It does
			// filter out other types of input, however (e.g. inputFieldType = password, ...).
			if (!elements.length || !isEditable || inputFieldType !== 'plainText') return null;
			const rect = convertToScreenCoordinates(Setting.value('windowContentZoomFactor'), elements[0].getBoundingClientRect());
			return rect.x < x && rect.y < y && rect.right > x && rect.bottom > y;
		}

		async function onContextMenu(event: ContextMenuEvent, params: ContextMenuParams) {
			if (!pointerInsideEditor(params)) return;

			// Don't show the default menu.
			event.preventDefault();

			const menu = new Menu();

			const hasSelectedText = editorRef.current && !!editorRef.current.getSelection() ;

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
						editorPaste();
					},
				})
			);

			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(params.misspelledWord, params.dictionarySuggestions);

			for (const item of spellCheckerMenuItems) {
				menu.append(new MenuItem(item));
			}

			// Typically CodeMirror handles all interactions itself (highlighting etc.)
			// But in the case of clicking a mispelled word, we need electron to handle the click
			// The result is that CodeMirror doesn't know what's been selected and doesn't
			// move the cursor into the correct location.
			// and when the user selects a new spelling it will be inserted in the wrong location
			// So in this situation, we use must manually align the internal codemirror selection
			// to the contextmenu selection
			if (editorRef.current && spellCheckerMenuItems.length > 0) {
				editorRef.current.alignSelection(params);
			}

			let filterObject: EditContextMenuFilterObject = {
				items: [],
			};

			filterObject = await eventManager.filterEmit('editorContextMenu', filterObject);

			for (const item of filterObject.items) {
				menu.append(new MenuItem({
					label: item.label,
					click: async () => {
						const args = item.commandArgs || [];
						void CommandService.instance().execute(item.commandName, ...args);
					},
					type: item.type,
				}));
			}

			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			menuUtils.pluginContextMenuItems(props.plugins, MenuItemLocation.EditorContextMenu).forEach((item: any) => {
				menu.append(new MenuItem(item));
			});

			menu.popup();
		}

		// Prepend the event listener so that it gets called before
		// the listener that shows the default menu.
		bridge().window().webContents.prependListener('context-menu', onContextMenu);

		return () => {
			bridge().window().webContents.off('context-menu', onContextMenu);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.plugins]);

	function renderEditor() {

		const matchBracesOptions = Setting.value('editor.autoMatchingBraces') ? { override: true, pairs: '``()[]{}\'\'""‘’“”（）《》「」『』【】〔〕〖〗〘〙〚〛' } : false;

		return (
			<div style={cellEditorStyle}>
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
			<div style={cellViewerStyle}>
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

	return (
		<ErrorBoundary message="The text editor encountered a fatal error and could not continue. The error might be due to a plugin, so please try to disable some of them and try again.">
			<div style={styles.root} ref={rootRef}>
				<div style={styles.rowToolbar}>
					<Toolbar themeId={props.themeId}/>
					{props.noteToolbar}
				</div>
				<div style={styles.rowEditorViewer}>
					{renderEditor()}
					{renderViewer()}
				</div>
			</div>
		</ErrorBoundary>
	);
}

export default forwardRef(CodeMirror);
