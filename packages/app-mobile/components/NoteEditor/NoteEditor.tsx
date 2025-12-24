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
import { ChangeEvent, EditorEvent, EditorEventType, EditorScrolledEvent, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
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
import Logger from '@joplin/utils/Logger';
import { Second } from '@joplin/utils/time';
import useDebounced from '../../utils/hooks/useDebounced';

const logger = Logger.create('NoteEditor');

type OnChange = (event: ChangeEvent)=> void;
type OnSearchVisibleChange = (visible: boolean)=> void;
type OnScroll = (event: EditorScrolledEvent)=> void;
type OnUndoRedoDepthChange = (event: UndoRedoDepthChangeEvent)=> void;
type OnSelectionChange = (event: SelectionRangeChangeEvent)=> void;
type OnAttach = (filePath?: string)=> Promise<void>;

interface Props {
	ref: Ref<EditorControl>;
	themeId: number;
	initialText: string;
	initialScroll: number;
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

	onScroll: OnScroll;
	onChange: OnChange;
	onSearchVisibleChange: OnSearchVisibleChange;
	onSelectionChange: OnSelectionChange;
	onUndoRedoDepthChange: OnUndoRedoDepthChange;
	onAttach: OnAttach;
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

const noteEditorSearchChangeSource = 'joplin.noteEditor.setSearchState';

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
			editorRef.current.setSearchState(state, noteEditorSearchChangeSource);
			setSearchState(state);
		};

		const control: EditorControl = {
			supportsCommand(command: EditorCommandType) {
				return editorRef.current.supportsCommand(command);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			execCommand(command, ...args: any[]) {
				logger.debug('execCommand', command);
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

			onResourceChanged: (id: string) => {
				editorRef.current.onResourceChanged(id);
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

const useHasSpaceForToolbar = () => {
	const [hasSpaceForToolbar, setHasSpaceForToolbar] = useState(true);

	const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
		const containerHeight = event.nativeEvent.layout.height;

		setHasSpaceForToolbar(containerHeight >= 140);
	}, []);

	const debouncedHasSpaceForToolbar = useDebounced(hasSpaceForToolbar, Second / 4);
	return { hasSpaceForToolbar: debouncedHasSpaceForToolbar, onContainerLayout };
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
		preferMacShortcuts: shim.mobilePlatform() === 'ios',

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
	const lastSearchVisibleRef = useRef<boolean|undefined>(undefined);
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
		case EditorEventType.UpdateSearchDialog: {
			const hasExternalChange = (
				event.changeSources.length !== 1
				|| event.changeSources[0] !== noteEditorSearchChangeSource
			);

			// If the change to the search was done by this editor, it was already applied to the
			// search state. Skipping the update in this case also helps avoid overwriting the
			// search state with an older value.
			const showSearch = event.searchState.dialogVisible ?? lastSearchVisibleRef.current;
			if (hasExternalChange) {
				setSearchState(event.searchState);

				if (showSearch) {
					editorControl.searchControl.showSearch();
				} else {
					editorControl.searchControl.hideSearch();
				}
			}

			if (showSearch !== lastSearchVisibleRef.current) {
				props.onSearchVisibleChange(showSearch);
				lastSearchVisibleRef.current = showSearch;
			}
			break;
		}
		case EditorEventType.Remove:
			// Not handled
			break;
		case EditorEventType.Scroll:
			props.onScroll(event);
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
		const isEncrypted = (resourceInfos: ResourceInfos, resourceId: string) => {
			return resourceInfos[resourceId]?.item?.encryption_blob_encrypted === 1;
		};
		for (const key in props.noteResources) {
			const wasDownloaded = isDownloaded(lastNoteResources.current, key);
			const hasDownloaded = !wasDownloaded && isDownloaded(props.noteResources, key);

			const wasEncrypted = isEncrypted(lastNoteResources.current, key);
			const hasDecrypted = wasEncrypted && !isEncrypted(props.noteResources, key);

			if (hasDownloaded || hasDecrypted) {
				editorControl.onResourceChanged(key);
			}
		}
	}, [props.noteResources, editorControl]);

	useEditorCommandHandler(editorControl);

	useImperativeHandle(props.ref, () => {
		return editorControl;
	});


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


	const { hasSpaceForToolbar, onContainerLayout } = useHasSpaceForToolbar();
	const toolbarEnabled = props.toolbarEnabled && hasSpaceForToolbar;
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
					initialScroll={props.initialScroll}
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
