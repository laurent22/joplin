import * as React from 'react';
import { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle, useMemo, ForwardedRef } from 'react';

import { EditorCommand, MarkupToHtmlOptions, NoteBodyEditorProps, NoteBodyEditorRef, OnChangeEvent } from '../../../utils/types';
import { getResourcesFromPasteEvent } from '../../../utils/resourceHandling';
import { ScrollOptions, ScrollOptionTypes } from '../../../utils/types';
import NoteTextViewer from '../../../../NoteTextViewer';
import Editor from './Editor';
import usePluginServiceRegistration from '../../../utils/usePluginServiceRegistration';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../../../services/bridge';
import shim from '@joplin/lib/shim';
import { MarkupToHtml } from '@joplin/renderer';
const { clipboard } = require('electron');
import { reg } from '@joplin/lib/registry';
import ErrorBoundary from '../../../../ErrorBoundary';
import { EditorKeymap, EditorLanguageType, EditorSettings, UserEventSource } from '@joplin/editor/types';
import useStyles from '../utils/useStyles';
import { EditorEvent, EditorEventType } from '@joplin/editor/events';
import useScrollHandler from '../utils/useScrollHandler';
import Logger from '@joplin/utils/Logger';
import useEditorCommands from './useEditorCommands';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import useContextMenu from '../utils/useContextMenu';
import useWebviewIpcMessage from '../utils/useWebviewIpcMessage';
import Toolbar from '../Toolbar';
import useEditorSearchHandler from '../utils/useEditorSearchHandler';

const logger = Logger.create('CodeMirror6');
const logDebug = (message: string) => logger.debug(message);

interface RenderedBody {
	html: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

const CodeMirror = (props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) => {
	const styles = useStyles(props);

	const [renderedBody, setRenderedBody] = useState<RenderedBody>(defaultRenderedBody()); // Viewer content
	const [renderedBodyContentKey, setRenderedBodyContentKey] = useState<string>(null);

	const [webviewReady, setWebviewReady] = useState(false);

	const editorRef = useRef<CodeMirrorControl>(null);
	const rootRef = useRef(null);
	const webviewRef = useRef(null);

	type OnChangeCallback = (event: OnChangeEvent)=> void;
	const props_onChangeRef = useRef<OnChangeCallback>(null);
	props_onChangeRef.current = props.onChange;

	const [selectionRange, setSelectionRange] = useState({ from: 0, to: 0 });

	const {
		resetScroll, editor_scroll, setEditorPercentScroll, setViewerPercentScroll, getLineScrollPercent,
	} = useScrollHandler(editorRef, webviewRef, props.onScroll);

	usePluginServiceRegistration(ref);

	const codeMirror_change = useCallback((newBody: string) => {
		if (newBody !== props.content) {
			props_onChangeRef.current({ changeId: null, content: newBody });
		}
	}, [props.content]);

	const onEditorPaste = useCallback(async (event: Event|null = null) => {
		const resourceMds = await getResourcesFromPasteEvent(event);
		if (!resourceMds.length) return;
		if (editorRef.current) {
			editorRef.current.insertText(resourceMds.join('\n'), UserEventSource.Paste);
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
			editorRef.current.insertText(modifiedMd, UserEventSource.Paste);
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
		contentMarkupLanguage: props.contentMarkupLanguage,
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
				return name in commands || editorRef.current.supportsCommand(name);
			},
			execCommand: async (cmd: EditorCommand) => {
				if (!editorRef.current) return false;

				logger.debug('execCommand', cmd);

				let commandOutput = null;
				if (cmd.name in commands) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					commandOutput = (commands as any)[cmd.name](cmd.value);
				} else if (editorRef.current.supportsCommand(cmd.name)) {
					commandOutput = editorRef.current.execCommand(cmd.name);
				} else if (editorRef.current.supportsJoplinCommand(cmd.name)) {
					commandOutput = editorRef.current.execJoplinCommand(cmd.name);
				} else {
					reg.logger().warn('CodeMirror: unsupported Joplin command: ', cmd);
				}

				return commandOutput;
			},
		};
	}, [props.content, commands, resetScroll, setEditorPercentScroll, setViewerPercentScroll]);

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
	}, [
		props.content, props.contentKey, renderedBodyContentKey, props.contentMarkupLanguage,
		props.visiblePanes, props.resourceInfos, props.markupToHtml, props.contentMaxWidth,
		props.noteId, props.useCustomPdfViewer,
	]);

	useEffect(() => {
		if (!webviewReady) return;

		let lineCount = 0;
		if (editorRef.current) {
			lineCount = editorRef.current.editor.state.doc.lines;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
	}, [renderedBody, webviewReady, getLineScrollPercent, setEditorPercentScroll]);

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
			output.display = 'none';
		} else if (!props.visiblePanes.includes('editor')) {
			output.borderLeftStyle = 'none';
		}
		return output;
	}, [styles.cellViewer, props.visiblePanes]);

	useEditorSearchHandler({
		setLocalSearchResultCount: props.setLocalSearchResultCount,
		searchMarkers: props.searchMarkers,
		webviewRef,
		editorRef,
		noteContent: props.content,
		renderedBody,
	});

	useContextMenu({
		plugins: props.plugins,
		editorCutText, editorCopyText, editorPaste,
		editorRef,
		editorClassName: 'cm-editor',
	});

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

		let keyboardMode = EditorKeymap.Default;
		if (props.keyboardMode === 'vim') {
			keyboardMode = EditorKeymap.Vim;
		} else if (props.keyboardMode === 'emacs') {
			keyboardMode = EditorKeymap.Emacs;
		}

		return {
			language: isHTMLNote ? EditorLanguageType.Html : EditorLanguageType.Markdown,
			readOnly: props.disabled || props.visiblePanes.indexOf('editor') < 0,
			katexEnabled: Setting.value('markdown.plugin.katex'),
			themeData: {
				...styles.globalTheme,
				monospaceFont: Setting.value('style.editor.monospaceFontFamily'),
			},
			automatchBraces: Setting.value('editor.autoMatchingBraces'),
			useExternalSearch: false,
			ignoreModifiers: true,
			spellcheckEnabled: Setting.value('editor.spellcheckBeta'),
			keymap: keyboardMode,
			indentWithTabs: true,
		};
	}, [
		props.contentMarkupLanguage, props.disabled, props.visiblePanes,
		props.keyboardMode, styles.globalTheme,
	]);

	// Update the editor's value
	useEffect(() => {
		if (editorRef.current?.updateBody(props.content)) {
			editorRef.current?.clearHistory();
		}
	}, [props.content]);

	const renderEditor = () => {
		return (
			<div style={cellEditorStyle}>
				<Editor
					style={styles.editor}
					initialText={props.content}
					ref={editorRef}
					settings={editorSettings}
					pluginStates={props.plugins}
					onEvent={onEditorEvent}
					onLogMessage={logDebug}
					onEditorPaste={onEditorPaste}
				/>
			</div>
		);
	};

	const renderViewer = () => {
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
	};

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
};

export default forwardRef(CodeMirror);
