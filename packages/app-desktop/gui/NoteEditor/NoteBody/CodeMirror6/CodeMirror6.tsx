import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo, ForwardedRef } from 'react';

// eslint-disable-next-line no-unused-vars
import { EditorCommand, NoteBodyEditorProps, NoteBodyEditorRef } from '../../utils/types';
import { getResourcesFromPasteEvent } from '../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../utils/types';
import Toolbar from './Toolbar';
// import styles_ from './styles';
// import { RenderedBody, defaultRenderedBody } from './utils/types';
import NoteTextViewer from '../../../NoteTextViewer';
import Editor from './Editor';
import usePluginServiceRegistration from '../../utils/usePluginServiceRegistration';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../../services/bridge';
// import markdownUtils from '@joplin/lib/markdownUtils';
import shim from '@joplin/lib/shim';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
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
import usePrevious from '../../../hooks/usePrevious';
import { CodeMirrorControl } from '@joplin/editor/CodeMirror/createEditor';
import { EditorLanguageType, EditorSettings } from '@joplin/editor/types';
import useStyles from './useStyles';
import { EditorEvent, EditorEventType } from '@joplin/editor/events';
import useScrollHandler from './useScrollHandler';
import Logger from '@joplin/utils/Logger';
import useEditorCommands from './useEditorCommands';

const menuUtils = new MenuUtils(CommandService.instance());

const logger = Logger.create('CodeMirror6');
const logDebug = (message: string) => logger.debug(message);

interface RenderedBody {
	html: string;
	pluginAssets: any[];
}

function defaultRenderedBody(): RenderedBody {
	return {
		html: '',
		pluginAssets: [],
	};
}

function markupRenderOptions(override: MarkupToHtmlOptions = null): MarkupToHtmlOptions {
	return { ...override };
}

function CodeMirror(props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) {
	const styles = useStyles(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [renderedBodyContentKey, setRenderedBodyContentKey] = useState<string>(null);

	const [webviewReady, setWebviewReady] = useState(false);

	const previousContent = usePrevious(props.content);
	const previousRenderedBody = usePrevious(renderedBody);
	const previousSearchMarkers = usePrevious(props.searchMarkers);

	const editorRef = useRef<CodeMirrorControl>(null);
	const rootRef = useRef(null);
	const webviewRef = useRef(null);
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const props_onChangeRef = useRef<Function>(null);
	props_onChangeRef.current = props.onChange;

	const [selectionRange, setSelectionRange] = useState({ from: 0, to: 0 });

	const { // editor_resize, editor_update,
		resetScroll, editor_scroll, setEditorPercentScroll, setViewerPercentScroll, getLineScrollPercent,
	} = useScrollHandler(editorRef, webviewRef, props.onScroll);

	usePluginServiceRegistration(ref);

	const codeMirror_change = useCallback((newBody: string) => {
		props_onChangeRef.current({ changeId: null, content: newBody });
	}, []);

	const onEditorPaste = useCallback(async (event: any = null) => {
		const resourceMds = await getResourcesFromPasteEvent(event);
		if (!resourceMds.length) return;
		if (editorRef.current) {
			editorRef.current.insertText(resourceMds.join('\n'));
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
			editorRef.current.insertText(modifiedMd);
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

	const commands = useEditorCommands({
		webviewRef,
		editorRef,
		selectionRange,

		editorCopyText, editorCutText, editorPaste,
		editorContent: props.content,
		visiblePanes: props.visiblePanes,
	});

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
			supportsCommand: (name: string) => {
				return name in commands;
			},
			execCommand: async (cmd: EditorCommand) => {
				if (!editorRef.current) return false;

				logger.debug('execCommand', cmd);

				let commandOutput = null;
				if (cmd.name in commands) {
					commandOutput = (commands as any)[cmd.name](cmd.value);
				} else {
					reg.logger().warn('CodeMirror: unsupported Joplin command: ', cmd);
				}

				return commandOutput;
			},
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.content, commands]);

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
				const fraction = getLineScrollPercent();
				editorRef.current.editor.dispatch({
					changes: { from, to, insert: line },
				});
				setEditorPercentScroll(fraction);
			}
		} else if (msg === 'percentScroll') {
			const percent = arg0;
			setEditorPercentScroll(percent);
		} else {
			props.onMessage(event);
		}
	}, [props.onMessage, props.content, getLineScrollPercent, setEditorPercentScroll]);

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

		editorRef.current?.updateBody(props.content);

		return () => {
			cancelled = true;
			shim.clearTimeout(timeoutId);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.content, props.contentKey, renderedBodyContentKey, props.contentMarkupLanguage, props.visiblePanes, props.resourceInfos, props.markupToHtml]);

	useEffect(() => {
		if (!webviewReady) return;

		let lineCount = 0;
		if (editorRef.current) {
			lineCount = editorRef.current.editor.state.doc.lines;
		}

		const options: any = {
			pluginAssets: renderedBody.pluginAssets,
			downloadResources: Setting.value('sync.resourceDownloadMode'),
			markupLineCount: lineCount,
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
				//	const matches = editorRef.current.setMarkers(props.searchMarkers.keywords, props.searchMarkers.options);

				//	props.setLocalSearchResultCount(matches);
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

	// The below code adds support for spellchecking when it is enabled
	// It might be buggy, refer to the below issue
	// https://github.com/laurent22/joplin/pull/3974#issuecomment-718936703
	useEffect(() => {
		const isAncestorOfCodeMirrorEditor = (elem: HTMLElement) => {
			for (; elem.parentElement; elem = elem.parentElement) {
				if (elem.classList.contains('cm-editor')) {
					return true;
				}
			}

			return false;
		};

		let lastInCodeMirrorContextMenuTimestamp = 0;

		// The browser's contextmenu event provides additional information about the
		// target of the event, not provided by the Electron context-menu event.
		const onBrowserContextMenu = (event: Event) => {
			if (isAncestorOfCodeMirrorEditor(event.target as HTMLElement)) {
				lastInCodeMirrorContextMenuTimestamp = Date.now();
			}
		};

		function pointerInsideEditor(params: ContextMenuParams) {
			const x = params.x, y = params.y, isEditable = params.isEditable;
			const elements = document.getElementsByClassName('cm-editor');

			// Note: We can't check inputFieldType here. When spellcheck is enabled,
			// params.inputFieldType is "none". When spellcheck is disabled,
			// params.inputFieldType is "plainText". Thus, such a check would be inconsistent.
			if (!elements.length || !isEditable) return false;

			const maximumMsSinceBrowserEvent = 100;
			if (Date.now() - lastInCodeMirrorContextMenuTimestamp > maximumMsSinceBrowserEvent) {
				return false;
			}

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
						editorPaste();
					},
				}),
			);

			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(params.misspelledWord, params.dictionarySuggestions);

			for (const item of spellCheckerMenuItems) {
				menu.append(new MenuItem(item));
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

		window.addEventListener('contextmenu', onBrowserContextMenu);

		return () => {
			bridge().window().webContents.off('context-menu', onContextMenu);
			window.removeEventListener('contextmenu', onBrowserContextMenu);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.plugins]);

	const onEditorEvent = useCallback((event: EditorEvent) => {
		if (event.kind === EditorEventType.Scroll) {
			editor_scroll();
		} else if (event.kind === EditorEventType.Change) {
			codeMirror_change(event.value);
		} else if (event.kind === EditorEventType.SelectionRangeChange) {
			setSelectionRange({ from: event.from, to: event.to });
		}
	}, [editor_scroll, codeMirror_change]);

	const editorSettings = useMemo((): EditorSettings => {
		const isHTMLNote = props.contentMarkupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML;

		return {
			language: isHTMLNote ? EditorLanguageType.Html : EditorLanguageType.Markdown,
			readOnly: props.disabled || props.visiblePanes.indexOf('editor') < 0,
			katexEnabled: Setting.value('markdown.plugin.katex'),
			themeData: styles.globalTheme,
			automatchBraces: Setting.value('editor.autoMatchingBraces'),
			useExternalSearch: false,
			ignoreModifiers: true,
			spellcheckEnabled: Setting.value('editor.spellcheckBeta'),
		};
	}, [props.contentMarkupLanguage, props.disabled, props.visiblePanes, styles.globalTheme]);

	function renderEditor() {
		return (
			<div style={cellEditorStyle}>
				<Editor
					style={styles.editor}
					initialText={props.content}
					ref={editorRef}
					settings={editorSettings}
					plugins={props.plugins}
					onEvent={onEditorEvent}
					onLogMessage={logDebug}
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
