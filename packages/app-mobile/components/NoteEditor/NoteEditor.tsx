import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import themeToCss from '@joplin/lib/services/style/themeToCss';
import EditLinkDialog from './EditLinkDialog';
import { defaultSearchState, SearchPanel } from './SearchPanel';
import ExtendedWebView from '../ExtendedWebView';
import { WebViewControl } from '../ExtendedWebView/types';

import * as React from 'react';
import { forwardRef, RefObject, useEffect, useImperativeHandle } from 'react';
import { useMemo, useState, useCallback, useRef } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, View, ViewStyle } from 'react-native';
import { editorFont } from '../global-style';

import { EditorControl as EditorBodyControl, ContentScriptData } from '@joplin/editor/types';
import { EditorControl, EditorSettings, SelectionRange, WebViewToEditorApi } from './types';
import { _ } from '@joplin/lib/locale';
import { ChangeEvent, EditorEvent, EditorEventType, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
import { EditorCommandType, EditorKeymap, EditorLanguageType, SearchState } from '@joplin/editor/types';
import SelectionFormatting, { defaultSelectionFormatting } from '@joplin/editor/SelectionFormatting';
import useCodeMirrorPlugins from './hooks/useCodeMirrorPlugins';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { WebViewErrorEvent } from 'react-native-webview/lib/RNCWebViewNativeComponent';
import Logger from '@joplin/utils/Logger';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import useEditorCommandHandler from './hooks/useEditorCommandHandler';
import { OnMessageEvent } from '../ExtendedWebView/types';
import { join, dirname } from 'path';
import * as mimeUtils from '@joplin/lib/mime-utils';
import uuid from '@joplin/lib/uuid';
import EditorToolbar from '../EditorToolbar/EditorToolbar';

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionRangeChangeEvent)=> void;
type OnAttachCallback = (filePath?: string)=> Promise<void>;

const logger = Logger.create('NoteEditor');

interface Props {
	themeId: number;
	initialText: string;
	noteId: string;
	initialSelection?: SelectionRange;
	style: ViewStyle;
	toolbarEnabled: boolean;
	readOnly: boolean;
	plugins: PluginStates;

	onChange: ChangeEventHandler;
	onSelectionChange: SelectionChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
	onAttach: OnAttachCallback;
}

function fontFamilyFromSettings() {
	const font = editorFont(Setting.value('style.editor.fontFamily') as number);
	return font ? `${font}, sans-serif` : 'sans-serif';
}

function useCss(themeId: number): string {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		const themeVariableCss = themeToCss(theme);
		return `
			${themeVariableCss}

			:root {
				background-color: ${theme.backgroundColor};
			}

			body {
				margin: 0;
				height: 100vh;
				/* Prefer 100% -- 100vw shows an unnecessary horizontal scrollbar in Google Chrome (desktop). */
				width: 100%;
				box-sizing: border-box;

				padding-left: 1px;
				padding-right: 1px;
				padding-bottom: 1px;
				padding-top: 10px;

				font-size: 13pt;
			}

			* {
				scrollbar-width: thin;
				scrollbar-color: rgba(100, 100, 100, 0.7) rgba(0, 0, 0, 0.1);
			}

			@supports selector(::-webkit-scrollbar) {
				*::-webkit-scrollbar {
					width: 7px;
					height: 7px;
				}

				*::-webkit-scrollbar-corner {
					background: none;
				}

				*::-webkit-scrollbar-track {
					border: none;
				}

				*::-webkit-scrollbar-thumb {
					background: rgba(100, 100, 100, 0.3);
					border-radius: 5px;
				}

				*::-webkit-scrollbar-track:hover {
					background: rgba(0, 0, 0, 0.1);
				}

				*::-webkit-scrollbar-thumb:hover {
					background: rgba(100, 100, 100, 0.7);
				}

				* {
					scrollbar-width: unset;
					scrollbar-color: unset;
				}
			}
		`;
	}, [themeId]);
}

const themeStyleSheetClassName = 'note-editor-styles';
function useHtml(initialCss: string): string {
	const cssRef = useRef(initialCss);
	cssRef.current = initialCss;

	return useMemo(() => `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
				<title>${_('Note editor')}</title>
				<style>
					/* For better scrolling on iOS (working scrollbar) we use external, rather than internal,
						scrolling. */
					.cm-scroller {
						overflow: none;
					}
				</style>
				<style class=${JSON.stringify(themeStyleSheetClassName)}>
					${cssRef.current}
				</style>
			</head>
			<body>
				<div class="CodeMirror" style="height:100%;" autocapitalize="on"></div>
			</body>
		</html>
	`, []);
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

type OnSetVisibleCallback = (visible: boolean)=> void;
type OnSearchStateChangeCallback = (state: SearchState)=> void;
const useEditorControl = (
	bodyControl: EditorBodyControl,
	webviewRef: RefObject<WebViewControl>,
	setLinkDialogVisible: OnSetVisibleCallback,
	setSearchState: OnSearchStateChangeCallback,
): EditorControl => {
	return useMemo(() => {
		const execEditorCommand = (command: EditorCommandType) => {
			void bodyControl.execCommand(command);
		};

		const setSearchStateCallback = (state: SearchState) => {
			bodyControl.setSearchState(state);
			setSearchState(state);
		};

		const control: EditorControl = {
			supportsCommand(command: EditorCommandType) {
				return bodyControl.supportsCommand(command);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			execCommand(command, ...args: any[]) {
				return bodyControl.execCommand(command, ...args);
			},

			focus() {
				void bodyControl.execCommand(EditorCommandType.Focus);
			},

			undo() {
				bodyControl.undo();
			},
			redo() {
				bodyControl.redo();
			},
			select(anchor: number, head: number) {
				bodyControl.select(anchor, head);
			},
			setScrollPercent(fraction: number) {
				bodyControl.setScrollPercent(fraction);
			},
			insertText(text: string) {
				bodyControl.insertText(text);
			},
			updateBody(newBody: string) {
				bodyControl.updateBody(newBody);
			},
			updateSettings(newSettings: EditorSettings) {
				bodyControl.updateSettings(newSettings);
			},

			toggleBolded() {
				execEditorCommand(EditorCommandType.ToggleBolded);
			},
			toggleItalicized() {
				execEditorCommand(EditorCommandType.ToggleItalicized);
			},
			toggleOrderedList() {
				execEditorCommand(EditorCommandType.ToggleNumberedList);
			},
			toggleUnorderedList() {
				execEditorCommand(EditorCommandType.ToggleBulletedList);
			},
			toggleTaskList() {
				execEditorCommand(EditorCommandType.ToggleCheckList);
			},
			toggleCode() {
				execEditorCommand(EditorCommandType.ToggleCode);
			},
			toggleMath() {
				execEditorCommand(EditorCommandType.ToggleMath);
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

				execEditorCommand(levelToCommand[index]);
			},
			increaseIndent() {
				execEditorCommand(EditorCommandType.IndentMore);
			},
			decreaseIndent() {
				execEditorCommand(EditorCommandType.IndentLess);
			},
			updateLink(label: string, url: string) {
				bodyControl.updateLink(label, url);
			},
			scrollSelectionIntoView() {
				execEditorCommand(EditorCommandType.ScrollSelectionIntoView);
			},
			showLinkDialog() {
				setLinkDialogVisible(true);
			},
			hideLinkDialog() {
				setLinkDialogVisible(false);
			},
			hideKeyboard() {
				webviewRef.current.injectJS('document.activeElement?.blur();');
			},

			setContentScripts: async (plugins: ContentScriptData[]) => {
				return bodyControl.setContentScripts(plugins);
			},

			setSearchState: setSearchStateCallback,

			searchControl: {
				findNext() {
					execEditorCommand(EditorCommandType.FindNext);
				},
				findPrevious() {
					execEditorCommand(EditorCommandType.FindPrevious);
				},
				replaceNext() {
					execEditorCommand(EditorCommandType.ReplaceNext);
				},
				replaceAll() {
					execEditorCommand(EditorCommandType.ReplaceAll);
				},

				showSearch() {
					execEditorCommand(EditorCommandType.ShowSearch);
				},
				hideSearch() {
					execEditorCommand(EditorCommandType.HideSearch);
				},

				setSearchState: setSearchStateCallback,
			},
		};

		return control;
	}, [webviewRef, bodyControl, setLinkDialogVisible, setSearchState]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function NoteEditor(props: Props, ref: any) {
	const webviewRef = useRef<WebViewControl>(null);

	const setInitialSelectionJS = props.initialSelection ? `
		cm.select(${props.initialSelection.start}, ${props.initialSelection.end});
		cm.execCommand('scrollSelectionIntoView');
	` : '';

	const editorSettings: EditorSettings = useMemo(() => ({
		themeId: props.themeId,
		themeData: editorTheme(props.themeId),
		markdownMarkEnabled: Setting.value('markdown.plugin.mark'),
		katexEnabled: Setting.value('markdown.plugin.katex'),
		spellcheckEnabled: Setting.value('editor.mobile.spellcheckEnabled'),
		language: EditorLanguageType.Markdown,
		useExternalSearch: true,
		readOnly: props.readOnly,

		keymap: EditorKeymap.Default,

		automatchBraces: false,
		ignoreModifiers: false,
		autocompleteMarkup: Setting.value('editor.autocompleteMarkup'),

		// For now, mobile CodeMirror uses its built-in focus toggle shortcut.
		tabMovesFocus: false,
		indentWithTabs: true,

		editorLabel: _('Markdown editor'),
	}), [props.themeId, props.readOnly]);

	const injectedJavaScript = `
		window.onerror = (message, source, lineno) => {
			window.ReactNativeWebView.postMessage(
				"error: " + message + " in file://" + source + ", line " + lineno
			);
		};
		window.onunhandledrejection = (event) => {
			window.ReactNativeWebView.postMessage(
				"error: Unhandled promise rejection: " + event
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
				// On Android, injectJavaScript is run twice -- once before the parent element exists.
				// To avoid logging unnecessary errors to the console, skip setup in this case:
				if (parentElement) {
					const initialText = ${JSON.stringify(props.initialText)};
					const settings = ${JSON.stringify(editorSettings)};

					window.cm = codeMirrorBundle.initCodeMirror(
						parentElement,
						initialText,
						${JSON.stringify(props.noteId)},
						settings
					);

					${setInitialSelectionJS}

					window.onresize = () => {
						cm.execCommand('scrollSelectionIntoView');
					};
				} else {
					console.warn('No parent element for the editor found. This may mean that the editor HTML is still loading.');
				}
			} catch (e) {
				window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
			}
		}
		true;
	`;

	const css = useCss(props.themeId);

	useEffect(() => {
		if (webviewRef.current) {
			webviewRef.current.injectJS(`
				const styleClass = ${JSON.stringify(themeStyleSheetClassName)};
				for (const oldStyle of [...document.getElementsByClassName(styleClass)]) {
					oldStyle.remove();
				}

				const style = document.createElement('style');
				style.classList.add(styleClass);

				style.appendChild(document.createTextNode(${JSON.stringify(css)}));
				document.head.appendChild(style);
			`);
		}
	}, [css]);

	const html = useHtml(css);
	const [selectionState, setSelectionState] = useState<SelectionFormatting>(defaultSelectionFormatting);
	const [linkDialogVisible, setLinkDialogVisible] = useState(false);
	const [searchState, setSearchState] = useState(defaultSearchState);

	const onEditorEvent = useRef((_event: EditorEvent) => {});

	const onAttachRef = useRef(props.onAttach);
	onAttachRef.current = props.onAttach;

	const editorMessenger = useMemo(() => {
		const localApi: WebViewToEditorApi = {
			async onEditorEvent(event) {
				onEditorEvent.current(event);
			},
			async logMessage(message) {
				logger.debug('CodeMirror:', message);
			},
			async onPasteFile(type, data) {
				const tempFilePath = join(Setting.value('tempDir'), `paste.${uuid.createNano()}.${mimeUtils.toFileExtension(type)}`);
				await shim.fsDriver().mkdir(dirname(tempFilePath));
				try {
					await shim.fsDriver().writeFile(tempFilePath, data, 'base64');
					await onAttachRef.current(tempFilePath);
				} finally {
					await shim.fsDriver().remove(tempFilePath);
				}
			},
		};
		const messenger = new RNToWebViewMessenger<WebViewToEditorApi, EditorBodyControl>(
			'editor', webviewRef, localApi,
		);
		return messenger;
	}, []);

	const editorControl = useEditorControl(
		editorMessenger.remoteApi, webviewRef, setLinkDialogVisible, setSearchState,
	);

	useEffect(() => {
		editorControl.updateSettings(editorSettings);
	}, [editorSettings, editorControl]);

	useEditorCommandHandler(editorControl);

	useImperativeHandle(ref, () => {
		return editorControl;
	});

	useEffect(() => {
		onEditorEvent.current = (event: EditorEvent) => {
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
		};
	}, [props.onChange, props.onUndoRedoDepthChange, props.onSelectionChange, editorControl]);

	const codeMirrorPlugins = useCodeMirrorPlugins(props.plugins);
	useEffect(() => {
		void editorControl.setContentScripts(codeMirrorPlugins);
	}, [codeMirrorPlugins, editorControl]);

	const onLoadEnd = useCallback(() => {
		editorMessenger.onWebViewLoaded();
	}, [editorMessenger]);

	const onMessage = useCallback((event: OnMessageEvent) => {
		const data = event.nativeEvent.data;

		if (typeof data === 'string' && data.indexOf('error:') === 0) {
			logger.error('CodeMirror error', data);
			return;
		}

		editorMessenger.onWebViewMessage(event);
	}, [editorMessenger]);

	const onError = useCallback((event: NativeSyntheticEvent<WebViewErrorEvent>) => {
		logger.error(`Load error: Code ${event.nativeEvent.code}: ${event.nativeEvent.description}`);
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

	const toolbarEditorState = useMemo(() => ({
		selectionState,
		searchVisible: searchState.dialogVisible,
	}), [selectionState, searchState.dialogVisible]);

	const toolbar = <EditorToolbar editorState={toolbarEditorState} />;

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
			}}>
				<ExtendedWebView
					webviewInstanceId='NoteEditor'
					testID='NoteEditor'
					scrollEnabled={true}
					ref={webviewRef}
					html={html}
					injectedJavaScript={injectedJavaScript}
					hasPluginScripts={codeMirrorPlugins.length > 0}
					onMessage={onMessage}
					onLoadEnd={onLoadEnd}
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
