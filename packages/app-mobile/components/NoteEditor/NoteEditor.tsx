import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import EditLinkDialog from './EditLinkDialog';
import { defaultSearchState, SearchPanel } from './SearchPanel';
import { WebViewControl } from '../ExtendedWebView/types';

import * as React from 'react';
import { Ref, RefObject, useEffect, useImperativeHandle } from 'react';
import { useMemo, useState, useCallback, useRef } from 'react';
import { LayoutChangeEvent, Platform, View, ViewStyle } from 'react-native';
import { editorFont } from '../global-style';

import { EditorControl as EditorBodyControl, ContentScriptData } from '@joplin/editor/types';
import { EditorControl, EditorSettings, EditorType } from './types';
import { _ } from '@joplin/lib/locale';
import { ChangeEvent, EditorEvent, EditorEventType, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
import { EditorCommandType, EditorKeymap, EditorLanguageType, SearchState } from '@joplin/editor/types';
import SelectionFormatting, { defaultSelectionFormatting } from '@joplin/editor/SelectionFormatting';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import useEditorCommandHandler from './hooks/useEditorCommandHandler';
import EditorToolbar from '../EditorToolbar/EditorToolbar';
import { SelectionRange } from '../../contentScripts/markdownEditorBundle/types';
import MarkdownEditor from './MarkdownEditor';
import RichTextEditor from './RichTextEditor';
import { ResourceInfos } from '@joplin/renderer/types';
import CommandService from '@joplin/lib/services/CommandService';
import Resource from '@joplin/lib/models/Resource';
import { join } from 'path';
import uuid from '@joplin/lib/uuid';
import shim from '@joplin/lib/shim';
import { dirname } from '@joplin/utils/path';
import { toFileExtension } from '@joplin/lib/mime-utils';
import { MarkupLanguage } from '@joplin/renderer';
import WarningBanner from './WarningBanner';
import useIsScreenReaderEnabled from '../../utils/hooks/useIsScreenReaderEnabled';

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionRangeChangeEvent)=> void;
type OnAttachCallback = (filePath?: string)=> Promise<void>;

interface Props {
	ref: Ref<EditorControl>;
	themeId: number;
	initialText: string;
	mode: EditorType;
	markupLanguage: MarkupLanguage;
	noteId: string;
	noteHash: string;
	globalSearch: string;
	initialSelection?: SelectionRange;
	style: ViewStyle;
	toolbarEnabled: boolean;
	readOnly: boolean;
	plugins: PluginStates;
	noteResources: ResourceInfos;

	onChange: ChangeEventHandler;
	onSelectionChange: SelectionChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
	onAttach: OnAttachCallback;
}

function fontFamilyFromSettings() {
	const font = editorFont(Setting.value('style.editor.fontFamily') as number);
	return font ? `${font}, sans-serif` : 'sans-serif';
}

function editorTheme(themeId: number) {
	const fontSizeInPx = Setting.value('style.editor.fontSize');

	// Convert from `px` to `em`. To support font size scaling based on
	// system accessibility settings, we need to provide font sizes in `em`.
	// 16px is about 1em with the default root font size.
	const estimatedFontSizeInEm = fontSizeInPx / 16;

	return {
		themeId,
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
	editorRef: RefObject<EditorBodyControl>,
	webviewRef: RefObject<WebViewControl>,
	setLinkDialogVisible: OnSetVisibleCallback,
	setSearchState: OnSearchStateChangeCallback,
): EditorControl => {
	return useMemo(() => {
		const execEditorCommand = (command: EditorCommandType) => {
			void editorRef.current.execCommand(command);
		};

		const setSearchStateCallback = (state: SearchState) => {
			editorRef.current.setSearchState(state);
			setSearchState(state);
		};

		const control: EditorControl = {
			supportsCommand(command: EditorCommandType) {
				return editorRef.current.supportsCommand(command);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			execCommand(command, ...args: any[]) {
				return editorRef.current.execCommand(command, ...args);
			},

			focus() {
				void editorRef.current.execCommand(EditorCommandType.Focus);
			},

			undo() {
				editorRef.current.undo();
			},
			redo() {
				editorRef.current.redo();
			},
			select(anchor: number, head: number) {
				editorRef.current.select(anchor, head);
			},
			setScrollPercent(fraction: number) {
				editorRef.current.setScrollPercent(fraction);
			},
			insertText(text: string) {
				editorRef.current.insertText(text);
			},
			updateBody(newBody: string) {
				editorRef.current.updateBody(newBody);
			},
			updateSettings(newSettings: EditorSettings) {
				editorRef.current.updateSettings(newSettings);
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
				editorRef.current.updateLink(label, url);
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
				return editorRef.current.setContentScripts(plugins);
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

			onResourceDownloaded: (id: string) => {
				editorRef.current.onResourceDownloaded(id);
			},

			remove: () => {
				editorRef.current.remove();
			},
		};

		return control;
	}, [webviewRef, editorRef, setLinkDialogVisible, setSearchState]);
};

const useHighlightActiveLine = () => {
	const screenReaderEnabled = useIsScreenReaderEnabled();
	// Guess whether highlighting the active line can be enabled without triggering
	// https://github.com/codemirror/dev/issues/1559.
	const canHighlight = Platform.OS !== 'ios' || !screenReaderEnabled;
	return canHighlight && Setting.value('editor.highlightActiveLine');
};

function NoteEditor(props: Props) {
	const webviewRef = useRef<WebViewControl>(null);

	const highlightActiveLine = useHighlightActiveLine();
	const editorSettings: EditorSettings = useMemo(() => ({
		themeData: editorTheme(props.themeId),
		markdownMarkEnabled: Setting.value('markdown.plugin.mark'),
		katexEnabled: Setting.value('markdown.plugin.katex'),
		spellcheckEnabled: Setting.value('editor.mobile.spellcheckEnabled'),
		inlineRenderingEnabled: Setting.value('editor.inlineRendering'),
		imageRenderingEnabled: Setting.value('editor.imageRendering'),
		language: props.markupLanguage === MarkupLanguage.Html ? EditorLanguageType.Html : EditorLanguageType.Markdown,
		useExternalSearch: true,
		readOnly: props.readOnly,
		highlightActiveLine,

		keymap: EditorKeymap.Default,

		automatchBraces: false,
		ignoreModifiers: false,
		autocompleteMarkup: Setting.value('editor.autocompleteMarkup'),

		// For now, mobile CodeMirror uses its built-in focus toggle shortcut.
		tabMovesFocus: false,
		indentWithTabs: true,

		editorLabel: _('Markdown editor'),
	}), [props.themeId, props.readOnly, props.markupLanguage, highlightActiveLine]);

	const [selectionState, setSelectionState] = useState<SelectionFormatting>(defaultSelectionFormatting);
	const [linkDialogVisible, setLinkDialogVisible] = useState(false);
	const [searchState, setSearchState] = useState(defaultSearchState);

	const editorControlRef = useRef<EditorControl|null>(null);
	const onEditorEvent = (event: EditorEvent) => {
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
		case EditorEventType.FollowLink:
			void CommandService.instance().execute('openItem', event.link);
			break;
		case EditorEventType.UpdateSearchDialog:
			setSearchState(event.searchState);

			if (event.searchState.dialogVisible) {
				editorControl.searchControl.showSearch();
			} else {
				editorControl.searchControl.hideSearch();
			}
			break;
		case EditorEventType.Remove:
		case EditorEventType.Scroll:
			// Not handled
			break;
		default:
			exhaustivenessCheck = event;
			return exhaustivenessCheck;
		}
		return;
	};

	const editorRef = useRef<EditorBodyControl|null>(null);
	const editorControl = useEditorControl(
		editorRef, webviewRef, setLinkDialogVisible, setSearchState,
	);
	editorControlRef.current = editorControl;


	useEffect(() => {
		editorControl.updateSettings(editorSettings);
	}, [editorSettings, editorControl]);

	const lastNoteResources = useRef<ResourceInfos>(props.noteResources);
	useEffect(() => {
		const isDownloaded = (resourceInfos: ResourceInfos, resourceId: string) => {
			return resourceInfos[resourceId]?.localState?.fetch_status === Resource.FETCH_STATUS_DONE;
		};
		for (const key in props.noteResources) {
			const wasDownloaded = isDownloaded(lastNoteResources.current, key);
			if (!wasDownloaded && isDownloaded(props.noteResources, key)) {
				editorControl.onResourceDownloaded(key);
			}
		}
	}, [props.noteResources, editorControl]);

	useEditorCommandHandler(editorControl);

	useImperativeHandle(props.ref, () => {
		return editorControl;
	});

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

	const onAttach = useCallback(async (type: string, base64: string) => {
		const tempFilePath = join(Setting.value('tempDir'), `paste.${uuid.createNano()}.${toFileExtension(type)}`);
		await shim.fsDriver().mkdir(dirname(tempFilePath));
		try {
			await shim.fsDriver().writeFile(tempFilePath, base64, 'base64');
			await props.onAttach(tempFilePath);
		} finally {
			await shim.fsDriver().remove(tempFilePath);
		}
	}, [props.onAttach]);

	const toolbarEditorState = useMemo(() => ({
		selectionState,
		searchVisible: searchState.dialogVisible,
	}), [selectionState, searchState.dialogVisible]);

	const toolbar = <EditorToolbar editorState={toolbarEditorState} />;
	const EditorComponent = props.mode === EditorType.Markdown ? MarkdownEditor : RichTextEditor;

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
				<EditorComponent
					editorRef={editorRef}
					webviewRef={webviewRef}
					themeId={props.themeId}
					noteId={props.noteId}
					noteHash={props.noteHash}
					initialText={props.initialText}
					initialSelection={props.initialSelection}
					editorSettings={editorSettings}
					globalSearch={props.globalSearch}
					onEditorEvent={onEditorEvent}
					noteResources={props.noteResources}
					plugins={props.plugins}
					onAttach={onAttach}
				/>
			</View>

			<WarningBanner editorType={props.mode}/>

			<SearchPanel
				editorSettings={editorSettings}
				searchControl={editorControl.searchControl}
				searchState={searchState}
			/>

			{toolbarEnabled ? toolbar : null}
		</View>
	);
}

export default NoteEditor;
