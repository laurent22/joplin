import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import EditLinkDialog from './EditLinkDialog';
import { defaultSearchState, SearchPanel } from './SearchPanel';
import ExtendedWebView from '../ExtendedWebView';

import * as React from 'react';
import { forwardRef, RefObject, useImperativeHandle } from 'react';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { LayoutChangeEvent, View, ViewStyle } from 'react-native';
const { editorFont } = require('../global-style');

import { EditorControl, EditorSettings, SelectionRange } from './types';
import { _ } from '@joplin/lib/locale';
import MarkdownToolbar from './MarkdownToolbar/MarkdownToolbar';
import { ChangeEvent, EditorEvent, EditorEventType, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
import { EditorCommandType, EditorLanguageType, PluginData, SearchState } from '@joplin/editor/types';
import supportsCommand from '@joplin/editor/CodeMirror/editorCommands/supportsCommand';
import SelectionFormatting, { defaultSelectionFormatting } from '@joplin/editor/SelectionFormatting';

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionRangeChangeEvent)=> void;
type OnAttachCallback = ()=> void;

interface Props {
	themeId: number;
	initialText: string;
	initialSelection?: SelectionRange;
	style: ViewStyle;
	contentStyle?: ViewStyle;
	toolbarEnabled: boolean;
	readOnly: boolean;

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

		// To allow accessibility font scaling, we also need to set the
		// fontSize to a value in `em`s (relative scaling relative to
		// parent font size).
		fontSizeUnits: 'em',
		fontSize: estimatedFontSizeInEm,
		fontFamily: fontFamilyFromSettings(),
	};
}

type OnInjectJSCallback = (js: string)=> void;
type OnSetVisibleCallback = (visible: boolean)=> void;
type OnSearchStateChangeCallback = (state: SearchState)=> void;
const useEditorControl = (
	injectJS: OnInjectJSCallback, setLinkDialogVisible: OnSetVisibleCallback,
	setSearchState: OnSearchStateChangeCallback,
	searchStateRef: RefObject<SearchState>,
): EditorControl => {
	return useMemo(() => {
		const execCommand = (command: EditorCommandType) => {
			injectJS(`cm.execCommand(${JSON.stringify(command)})`);
		};

		const setSearchStateCallback = (state: SearchState) => {
			injectJS(`cm.searchControl.setSearchState(${JSON.stringify(state)})`);
			setSearchState(state);
		};

		const control: EditorControl = {
			supportsCommand(command: EditorCommandType) {
				return supportsCommand(command);
			},
			execCommand,

			undo() {
				execCommand(EditorCommandType.Undo);
			},
			redo() {
				execCommand(EditorCommandType.Redo);
			},
			select(anchor: number, head: number) {
				injectJS(
					`cm.select(${JSON.stringify(anchor)}, ${JSON.stringify(head)});`,
				);
			},
			setScrollPercent(fraction: number) {
				injectJS(`cm.setScrollFraction(${JSON.stringify(fraction)})`);
			},
			insertText(text: string) {
				injectJS(`cm.insertText(${JSON.stringify(text)});`);
			},
			updateBody(newBody: string) {
				injectJS(`cm.updateBody(${JSON.stringify(newBody)});`);
			},
			updateSettings(newSettings: EditorSettings) {
				injectJS(`cm.updateSettings(${JSON.stringify(newSettings)})`);
			},

			toggleBolded() {
				execCommand(EditorCommandType.ToggleBolded);
			},
			toggleItalicized() {
				execCommand(EditorCommandType.ToggleItalicized);
			},
			toggleOrderedList() {
				execCommand(EditorCommandType.ToggleNumberedList);
			},
			toggleUnorderedList() {
				execCommand(EditorCommandType.ToggleCheckList);
			},
			toggleTaskList() {
				execCommand(EditorCommandType.ToggleCheckList);
			},
			toggleCode() {
				execCommand(EditorCommandType.ToggleCode);
			},
			toggleMath() {
				execCommand(EditorCommandType.ToggleMath);
			},
			toggleHeaderLevel(level: number) {
				const levelToCommand = [
					EditorCommandType.ToggleHeading1,
					EditorCommandType.ToggleHeading2,
					EditorCommandType.ToggleHeading3,
					EditorCommandType.ToggleHeading4,
					EditorCommandType.ToggleHeading5,
				];

				const index = level - 1;

				if (index < 0 || index >= levelToCommand.length) {
					throw new Error(`Unsupported header level ${level}`);
				}

				execCommand(levelToCommand[index]);
			},
			increaseIndent() {
				execCommand(EditorCommandType.IndentMore);
			},
			decreaseIndent() {
				execCommand(EditorCommandType.IndentLess);
			},
			updateLink(label: string, url: string) {
				injectJS(`cm.updateLink(
					${JSON.stringify(label)},
					${JSON.stringify(url)}
				);`);
			},
			scrollSelectionIntoView() {
				execCommand(EditorCommandType.ScrollSelectionIntoView);
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

			setPlugins: async (plugins: PluginData[]) => {
				injectJS(`cm.setPlugins(${JSON.stringify(plugins)});`);
			},

			setSearchState: setSearchStateCallback,

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

				setSearchState: setSearchStateCallback,
			},
		};

		return control;
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
		language: EditorLanguageType.Markdown,
		useExternalSearch: true,
		readOnly: props.readOnly,

		automatchBraces: false,
		ignoreModifiers: false,
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
	const [selectionState, setSelectionState] = useState<SelectionFormatting>(defaultSelectionFormatting);
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
		injectJS, setLinkDialogVisible, setSearchState, searchStateRef,
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

		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		const handlers: Record<string, Function> = {
			onLog: (event: any) => {
				// eslint-disable-next-line no-console
				console.info('CodeMirror:', ...event.value);
			},

			onEditorEvent: (event: EditorEvent) => {
				let exhaustivenessCheck: never;
				switch (event.kind) {
				case EditorEventType.Change:
					props.onChange(event);
					break;
				case EditorEventType.UndoRedoDepthChange:
					props.onUndoRedoDepthChange(event);
					break;
				case EditorEventType.SelectionRangeChange:
					props.onSelectionChange(event);
					break;
				case EditorEventType.SelectionFormattingChange:
					setSelectionState(event.formatting);
					break;
				case EditorEventType.EditLink:
					editorControl.showLinkDialog();
					break;
				case EditorEventType.UpdateSearchDialog:
					setSearchState(event.searchState);

					if (event.searchState.dialogVisible) {
						editorControl.searchControl.showSearch();
					} else {
						editorControl.searchControl.hideSearch();
					}
					break;
				case EditorEventType.Scroll:
					// Not handled
					break;
				default:
					exhaustivenessCheck = event;
					return exhaustivenessCheck;
				}
				return;
			},
		};

		if (handlers[msg.name]) {
			handlers[msg.name](msg.data);
		} else {
			// eslint-disable-next-line no-console
			console.info('Unsupported CodeMirror message:', msg);
		}
	}, [props.onSelectionChange, props.onUndoRedoDepthChange, props.onChange, editorControl]);

	const onError = useCallback(() => {
		console.error('NoteEditor: webview error');
	}, []);

	const [hasSpaceForToolbar, setHasSpaceForToolbar] = useState(true);
	const toolbarEnabled = props.toolbarEnabled && hasSpaceForToolbar;

	const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
		const containerHeight = event.nativeEvent.layout.height;

		if (containerHeight < 140) {
			setHasSpaceForToolbar(false);
		} else {
			setHasSpaceForToolbar(true);
		}
	}, []);

	const toolbar = <MarkdownToolbar
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
		readOnly={props.readOnly}
	/>;

	// - `scrollEnabled` prevents iOS from scrolling the document (has no effect on Android)
	//    when an editable region (e.g. a the full-screen NoteEditor) is focused.
	return (
		<View
			testID='note-editor-root'
			onLayout={onContainerLayout}
			style={{
				...props.style,
				flexDirection: 'column',
			}}
		>
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

			{toolbarEnabled ? toolbar : null}
		</View>
	);
}

export default forwardRef(NoteEditor);
