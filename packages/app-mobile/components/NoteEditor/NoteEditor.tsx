import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import EditLinkDialog from './EditLinkDialog';
import { defaultSearchState, SearchPanel } from './SearchPanel';
import ExtendedWebView from '../ExtendedWebView';

const React = require('react');
import { forwardRef, RefObject, useImperativeHandle } from 'react';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
const { editorFont } = require('../global-style');

import SelectionFormatting from './SelectionFormatting';
import {
	EditorSettings, EditorControl,
	ChangeEvent, UndoRedoDepthChangeEvent, Selection, SelectionChangeEvent, ListType, SearchState,
} from './types';
import { _ } from '@joplin/lib/locale';
import MarkdownToolbar from './MarkdownToolbar/MarkdownToolbar';

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionChangeEvent)=> void;
type OnAttachCallback = ()=> void;

interface Props {
	themeId: number;
	initialText: string;
	initialSelection?: Selection;
	style: ViewStyle;
	contentStyle?: ViewStyle;

	onChange: ChangeEventHandler;
	onSelectionChange: SelectionChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
	onAttach: OnAttachCallback;
}

function fontFamilyFromSettings() {
	const font = editorFont(Setting.value('style.editor.fontFamily'));
	return font ? `${font}, sans-serif` : 'sans-serif';
}

function useCss(themeId: number): string {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return `
			:root {
				background-color: ${theme.backgroundColor};
			}

			body {
				margin: 0;
				height: 100vh;
				width: 100vh;
				width: 100vw;
				min-width: 100vw;
				box-sizing: border-box;

				padding-left: 1px;
				padding-right: 1px;
				padding-bottom: 1px;
				padding-top: 10px;

				font-size: 13pt;
			}
		`;
	}, [themeId]);
}

function useHtml(css: string): string {
	const [html, setHtml] = useState('');

	useMemo(() => {
		setHtml(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
					<title>${_('Note editor')}</title>
					<style>
						.cm-editor {
							height: 100%;
						}

						${css}
					</style>
				</head>
				<body>
					<div class="CodeMirror" style="height:100%;" autocapitalize="on"></div>
				</body>
			</html>
		`);
	}, [css]);

	return html;
}

function editorTheme(themeId: number) {
	const fontSizeInPx = Setting.value('style.editor.fontSize');

	// Convert from `px` to `em`. To support font size scaling based on
	// system accessibility settings, we need to provide font sizes in `em`.
	// 16px is about 1em with the default root font size.
	const estimatedFontSizeInEm = fontSizeInPx / 16;

	return {
		...themeStyle(themeId),
		fontSize: estimatedFontSizeInEm,
		fontFamily: fontFamilyFromSettings(),
	};
}

type OnInjectJSCallback = (js: string)=> void;
type OnSetVisibleCallback = (visible: boolean)=> void;
type OnSearchStateChangeCallback = (state: SearchState)=> void;
const useEditorControl = (
	injectJS: OnInjectJSCallback, setLinkDialogVisible: OnSetVisibleCallback,
	setSearchState: OnSearchStateChangeCallback, searchStateRef: RefObject<SearchState>
): EditorControl => {
	return useMemo(() => {
		return {
			undo() {
				injectJS('cm.undo();');
			},
			redo() {
				injectJS('cm.redo();');
			},
			select(anchor: number, head: number) {
				injectJS(
					`cm.select(${JSON.stringify(anchor)}, ${JSON.stringify(head)});`
				);
			},
			insertText(text: string) {
				injectJS(`cm.insertText(${JSON.stringify(text)});`);
			},

			toggleBolded() {
				injectJS('cm.toggleBolded();');
			},
			toggleItalicized() {
				injectJS('cm.toggleItalicized();');
			},
			toggleList(listType: ListType) {
				injectJS(`cm.toggleList(${JSON.stringify(listType)});`);
			},
			toggleCode() {
				injectJS('cm.toggleCode();');
			},
			toggleMath() {
				injectJS('cm.toggleMath();');
			},
			toggleHeaderLevel(level: number) {
				injectJS(`cm.toggleHeaderLevel(${level});`);
			},
			increaseIndent() {
				injectJS('cm.increaseIndent();');
			},
			decreaseIndent() {
				injectJS('cm.decreaseIndent();');
			},
			updateLink(label: string, url: string) {
				injectJS(`cm.updateLink(
					${JSON.stringify(label)},
					${JSON.stringify(url)}
				);`);
			},
			scrollSelectionIntoView() {
				injectJS('cm.scrollSelectionIntoView();');
			},
			showLinkDialog() {
				setLinkDialogVisible(true);
			},
			hideLinkDialog() {
				setLinkDialogVisible(false);
			},
			hideKeyboard() {
				injectJS('document.activeElement?.blur();');
			},
			searchControl: {
				findNext() {
					injectJS('cm.searchControl.findNext();');
				},
				findPrevious() {
					injectJS('cm.searchControl.findPrevious();');
				},
				replaceCurrent() {
					injectJS('cm.searchControl.replaceCurrent();');
				},
				replaceAll() {
					injectJS('cm.searchControl.replaceAll();');
				},
				setSearchState(state: SearchState) {
					injectJS(`cm.searchControl.setSearchState(${JSON.stringify(state)})`);
					setSearchState(state);
				},
				showSearch() {
					setSearchState({
						...searchStateRef.current,
						dialogVisible: true,
					});
				},
				hideSearch() {
					setSearchState({
						...searchStateRef.current,
						dialogVisible: false,
					});
				},
			},
		};
	}, [injectJS, searchStateRef, setLinkDialogVisible, setSearchState]);
};

function NoteEditor(props: Props, ref: any) {
	const webviewRef = useRef(null);

	const setInitialSelectionJS = props.initialSelection ? `
		cm.select(${props.initialSelection.start}, ${props.initialSelection.end});
	` : '';

	const editorSettings: EditorSettings = {
		themeId: props.themeId,
		themeData: editorTheme(props.themeId),
		katexEnabled: Setting.value('markdown.plugin.katex'),
		spellcheckEnabled: Setting.value('editor.mobile.spellcheckEnabled'),
	};

	const injectedJavaScript = `
		function postMessage(name, data) {
			window.ReactNativeWebView.postMessage(JSON.stringify({
				data,
				name,
			}));
		}

		function logMessage(...msg) {
			postMessage('onLog', { value: msg });
		}

		// Globalize logMessage, postMessage
		window.logMessage = logMessage;
		window.postMessage = postMessage;

		window.onerror = (message, source, lineno) => {
			window.ReactNativeWebView.postMessage(
				"error: " + message + " in file://" + source + ", line " + lineno
			);
		};

		if (!window.cm) {
			// This variable is not used within this script
			// but is called using "injectJavaScript" from
			// the wrapper component.
			window.cm = null;

			try {
				${shim.injectedJs('codeMirrorBundle')};

				const parentElement = document.getElementsByClassName('CodeMirror')[0];
				const initialText = ${JSON.stringify(props.initialText)};
				const settings = ${JSON.stringify(editorSettings)};

				cm = codeMirrorBundle.initCodeMirror(parentElement, initialText, settings);
				${setInitialSelectionJS}

				window.onresize = () => {
					cm.scrollSelectionIntoView();
				};
			} catch (e) {
				window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
			}
		}
		true;
	`;

	const css = useCss(props.themeId);
	const html = useHtml(css);
	const [selectionState, setSelectionState] = useState(new SelectionFormatting());
	const [linkDialogVisible, setLinkDialogVisible] = useState(false);
	const [searchState, setSearchState] = useState(defaultSearchState);

	// Having a [searchStateRef] allows [editorControl] to not be re-created
	// whenever [searchState] changes.
	const searchStateRef = useRef(defaultSearchState);

	// Keep the reference and the [searchState] in sync
	useEffect(() => {
		searchStateRef.current = searchState;
	}, [searchState]);

	// / Runs [js] in the context of the CodeMirror frame.
	const injectJS = (js: string) => {
		webviewRef.current.injectJS(js);
	};

	const editorControl = useEditorControl(
		injectJS, setLinkDialogVisible, setSearchState, searchStateRef
	);

	useImperativeHandle(ref, () => {
		return editorControl;
	});

	const onMessage = useCallback((event: any) => {
		const data = event.nativeEvent.data;

		if (data.indexOf('error:') === 0) {
			console.error('CodeMirror:', data);
			return;
		}

		const msg = JSON.parse(data);

		const handlers: Record<string, Function> = {
			onLog: (event: any) => {
				console.info('CodeMirror:', ...event.value);
			},

			onChange: (event: ChangeEvent) => {
				props.onChange(event);
			},

			onUndoRedoDepthChange: (event: UndoRedoDepthChangeEvent) => {
				console.info('onUndoRedoDepthChange', event);
				props.onUndoRedoDepthChange(event);
			},

			onSelectionChange: (event: SelectionChangeEvent) => {
				props.onSelectionChange(event);
			},

			onSelectionFormattingChange(data: string) {
				// We want a SelectionFormatting object, so are
				// instantiating it from JSON.
				const formatting = SelectionFormatting.fromJSON(data);
				setSelectionState(formatting);
			},

			onRequestLinkEdit() {
				editorControl.showLinkDialog();
			},

			onRequestShowSearch(data: SearchState) {
				setSearchState(data);
				editorControl.searchControl.showSearch();
			},

			onRequestHideSearch() {
				editorControl.searchControl.hideSearch();
			},
		};

		if (handlers[msg.name]) {
			handlers[msg.name](msg.data);
		} else {
			console.info('Unsupported CodeMirror message:', msg);
		}
	}, [props.onSelectionChange, props.onUndoRedoDepthChange, props.onChange, editorControl]);

	const onError = useCallback(() => {
		console.error('NoteEditor: webview error');
	}, []);

	// - `scrollEnabled` prevents iOS from scrolling the document (has no effect on Android)
	//    when an editable region (e.g. a the full-screen NoteEditor) is focused.
	return (
		<View style={{
			...props.style,
			flexDirection: 'column',
		}}>
			<EditLinkDialog
				visible={linkDialogVisible}
				themeId={props.themeId}
				editorControl={editorControl}
				selectionState={selectionState}
			/>
			<View style={{
				flexGrow: 1,
				flexShrink: 0,
				minHeight: '30%',
				...props.contentStyle,
			}}>
				<ExtendedWebView
					webviewInstanceId='NoteEditor'
					themeId={props.themeId}
					scrollEnabled={false}
					ref={webviewRef}
					html={html}
					injectedJavaScript={injectedJavaScript}
					onMessage={onMessage}
					onError={onError}
				/>
			</View>

			<SearchPanel
				editorSettings={editorSettings}
				searchControl={editorControl.searchControl}
				searchState={searchState}
			/>

			<MarkdownToolbar
				style={{
					// Don't show the markdown toolbar if there isn't enough space
					// for it:
					flexShrink: 1,
				}}
				editorSettings={editorSettings}
				editorControl={editorControl}
				selectionState={selectionState}
				searchState={searchState}
				onAttach={props.onAttach}
			/>
		</View>
	);
}

export default forwardRef(NoteEditor);
