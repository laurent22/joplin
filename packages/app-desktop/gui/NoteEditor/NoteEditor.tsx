import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
import { NoteEntity } from '@joplin/lib/services/database/types';
import TinyMCE from './NoteBody/TinyMCE/TinyMCE';
import { connect } from 'react-redux';
import MultiNoteActions from '../MultiNoteActions';
import { htmlToMarkdown } from './utils';
import useSearchMarkers from './utils/useSearchMarkers';
import useNoteSearchBar from './utils/useNoteSearchBar';
import useMessageHandler from './utils/useMessageHandler';
import useWindowCommandHandler from './utils/useWindowCommandHandler';
import useDropHandler from './utils/useDropHandler';
import useMarkupToHtml from '../hooks/useMarkupToHtml';
import useFormNote, { OnLoadEvent, OnSetFormNote } from './utils/useFormNote';
import useEffectiveNoteId from './utils/useEffectiveNoteId';
import useFolder from './utils/useFolder';
import styles_ from './styles';
import { NoteEditorProps, FormNote, OnChangeEvent, AllAssetsOptions, NoteBodyEditorRef, NoteBodyEditorPropsAndRef, NoteBodyEditorType } from './utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import Button, { ButtonLevel } from '../Button/Button';
import eventManager, { EventName, NoteLockNoteStateChangeEvent } from '@joplin/lib/eventManager';
import { AppState } from '../../app.reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { _, _n } from '@joplin/lib/locale';
import NoteTitleBar from './NoteTitle/NoteTitleBar';
import markupLanguageUtils from '@joplin/lib/utils/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import { itemIsReadOnly } from '@joplin/lib/models/utils/readOnly';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import NoteLockPanel from './NoteLockPanel/NoteLockPanel';
import { themeStyle } from '@joplin/lib/theme';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import NoteSearchBar from '../NoteSearchBar';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import NoteRevisionViewer from '../NoteRevisionViewer';
import { parseShareCache } from '@joplin/lib/services/share/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { ModelType } from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ErrorCode } from '@joplin/lib/errors';
import ItemChange from '@joplin/lib/models/ItemChange';
import PlainEditor from './NoteBody/PlainEditor/PlainEditor';
import CodeMirror6 from './NoteBody/CodeMirror/v6/CodeMirror';
import CodeMirror5 from './NoteBody/CodeMirror/v5/CodeMirror';
import WhiteboardEditor from './NoteBody/WhiteboardEditor/WhiteboardEditor';
import { hasWhiteboardFence } from '@joplin/lib/services/whiteboard/parse';
import { openItemById } from './utils/contextMenu';
import { MarkupLanguage } from '@joplin/renderer';
import useScrollWhenReadyOptions from './utils/useScrollWhenReadyOptions';
import useScheduleSaveCallbacks from './utils/useScheduleSaveCallbacks';
import WarningBanner from './WarningBanner/WarningBanner';
import UserWebview from '../../services/plugins/UserWebview';
import Logger from '@joplin/utils/Logger';
import usePluginEditorView from './utils/usePluginEditorView';
import { defaultWindowId, stateUtils } from '@joplin/lib/reducer';
import { WindowIdContext } from '../NewWindowOrIFrame';
import useResourceUnwatcher from './utils/useResourceUnwatcher';
import StatusBar from './StatusBar';
import useVisiblePluginEditorViewIds from '@joplin/lib/hooks/plugins/useVisiblePluginEditorViewIds';
import useConnectToEditorPlugin from './utils/useConnectToEditorPlugin';
import getResourceBaseUrl from './utils/getResourceBaseUrl';
import useInitialCursorLocation from './utils/useInitialCursorLocation';
import NotePositionService, { EditorCursorLocations } from '@joplin/lib/services/NotePositionService';
import { blur } from '@joplin/lib/utils/focusHandler';

const debounce = require('debounce');

const logger = Logger.create('NoteEditor');

const commands = [
	require('./commands/showRevisions'),
];

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

const onDragOver: React.DragEventHandler = event => event.preventDefault();
let editorIdCounter = 0;

function NoteEditorContent(props: NoteEditorProps) {
	const [showRevisions, setShowRevisions] = useState(false);
	const [titleHasBeenManuallyChanged, setTitleHasBeenManuallyChanged] = useState(false);
	const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
	const [reloadInProgress, setReloadInProgress] = useState(false);

	const editorRef = useRef<NoteBodyEditorRef|null>(null);
	const titleInputRef = useRef<HTMLInputElement|null>(null);
	const isMountedRef = useRef(true);
	const noteSearchBarRef = useRef(null);

	// Should be constant and unique to this instance of the editor.
	const editorId = useMemo(() => {
		return `editor-${editorIdCounter++}`;
	}, []);

	const setFormNoteRef = useRef<OnSetFormNote>(null);
	const formNoteRef = useRef<FormNote>(null);
	const { saveNoteIfWillChange, scheduleSaveNote } = useScheduleSaveCallbacks({
		setFormNote: setFormNoteRef, formNote: formNoteRef, dispatch: props.dispatch, editorRef, editorId,
		editorNoteReloadTimeRequest: props.editorNoteReloadTimeRequest,
	});
	const formNote_beforeLoad = useCallback(async (event: OnLoadEvent) => {
		await saveNoteIfWillChange(event.formNote);
		// The lock must wait for the pending saves of the note being left: a locked note's save
		// needs the unlocked session to encrypt, so locking first would drop the last edits.
		// The note being left may have no form note at all (unlock or cannot-decrypt overlay).
		if (isNoteLockEnabled() && Setting.value('noteLock.lockOnNoteSwitch')) {
			await event.formNote.saveActionQueue?.waitForAllDone();
			NoteLockSession.instance().lock();
		}
		setShowRevisions(false);
	}, [saveNoteIfWillChange]);

	const formNote_afterLoad = useCallback(async () => {
		setTitleHasBeenManuallyChanged(false);
	}, []);

	const effectiveNoteId = useEffectiveNoteId(props);
	const { editorPlugin, editorView } = usePluginEditorView(props.plugins);
	const builtInEditorVisible = !editorPlugin;
	const windowId = useContext(WindowIdContext);
	const onDecryptFailedChange = useCallback((value: boolean) => {
		props.dispatch({ type: 'SET_ACTIVE_NOTE_IS_UNDECRYPTABLE', value, windowId });
	}, [props.dispatch, windowId]);
	const onReloadInProgressChange = useCallback((value: boolean) => {
		if (value) {
			// TinyMCE edits inside its own document. Blurring only the outer window does
			// not reliably stop input when the editor is in a secondary window.
			editorRef.current?.blurEditor?.();

			// Blur only the window whose editor is being refreshed. A secondary window
			// can refresh in response to a change saved by the main editor; blurring the
			// global document here would incorrectly interrupt typing in the main window.
			const editorWindowActiveElement = containerRef.current?.ownerDocument?.activeElement;
			if (editorWindowActiveElement) {
				blur('NoteEditor::reloadEditorWindow', editorWindowActiveElement);
			}
		}
		setReloadInProgress(value);
		if (!value) {
			// TinyMCE can report onWillChange before a reload, then have its delayed
			// onChange rejected while the reload is in progress. Since no save is queued
			// in that case, clear the saving status when the reload completes.
			props.dispatch({
				type: 'EDITOR_NOTE_STATUS_REMOVE',
				id: effectiveNoteId,
			});
		}
	}, [effectiveNoteId, props.dispatch]);

	const { formNote, setFormNote, isNewNote, resourceInfos, decryptFailed, loadBlocked } = useFormNote({
		noteId: effectiveNoteId,
		isProvisional: props.isProvisional,
		titleInputRef: titleInputRef,
		editorRef: editorRef,
		onBeforeLoad: formNote_beforeLoad,
		onAfterLoad: formNote_afterLoad,
		builtInEditorVisible,
		editorId,
		noteLockSessionUnlocked: props.noteLockSessionUnlocked,
		onDecryptFailedChange,
		onReloadInProgressChange,
		editorNoteReloadTimeRequest: props.editorNoteReloadTimeRequest,
	});
	setFormNoteRef.current = setFormNote;
	formNoteRef.current = { ...formNote };

	useEffect(() => {
		if (!isNoteLockEnabled()) return () => {};
		// Pending scheduled saves read the lock state from the form note, so it must follow an
		// enable/disable triggered outside the editor (note list menu, another window) immediately.
		const onLockStateChange = (event: NoteLockNoteStateChangeEvent) => {
			if (formNoteRef.current.id !== event.noteId) return;
			// Enabling requires an unlocked session, so capture the key the same way a decrypt
			// does - a pending save can then still encrypt if the session locks before it runs.
			const noteLockKey = event.isLocked && NoteLockSession.instance().isUnlocked() ? NoteLockSession.instance().decryptedKey() : null;
			const newFormNote = { ...formNoteRef.current, is_locked: event.isLocked ? 1 : 0, noteLockKey, isDecrypted: event.isLocked };
			setFormNote(newFormNote);
			void scheduleSaveNote(newFormNote);
		};
		eventManager.on(EventName.NoteLockNoteStateChange, onLockStateChange);
		return () => {
			eventManager.off(EventName.NoteLockNoteStateChange, onLockStateChange);
		};
	}, [setFormNote, scheduleSaveNote]);

	useAsyncEffect(async () => {
		if (!isNoteLockEnabled() || props.noteLockSessionUnlocked) return;
		const lockedFormNote = formNoteRef.current;
		if (!lockedFormNote?.is_locked || !lockedFormNote.hasChanged) return;
		// The panel replaces the editor only once the edits are written, so flush them the same way
		// a note switch does before locking.
		await saveNoteIfWillChange(lockedFormNote);
		// The editor dispatches its pending change when it unmounts, which would be saved over the
		// flushed one - clearing the change id makes onFieldChange drop it, as a note switch does.
		setFormNote(prev => ({ ...prev, bodyWillChangeId: 0 }));
		await lockedFormNote.saveActionQueue?.waitForAllDone();
	}, [props.noteLockSessionUnlocked, saveNoteIfWillChange]);

	const formNoteFolder = useFolder({ folderId: formNote.parent_id });

	const shownEditorViewIds = useVisiblePluginEditorViewIds(props.plugins, windowId);
	useConnectToEditorPlugin({
		startupPluginsLoaded: props.startupPluginsLoaded,
		setFormNote,
		scheduleSaveNote,
		formNote,
		effectiveNoteId,
		shownEditorViewIds,
		activeEditorView: editorView,
		plugins: props.plugins,
	});

	const {
		localSearch,
		onChange: localSearch_change,
		onNext: localSearch_next,
		onPrevious: localSearch_previous,
		onClose: localSearch_close,
		setResultCount: setLocalSearchResultCount,
		showLocalSearch,
		setShowLocalSearch,
		searchMarkers: localSearchMarkerOptions,
	} = useNoteSearchBar({ noteSearchBarRef });

	// If the note has been modified in another editor, wait for it to be saved
	// before loading it in this editor.
	// const waitingToSaveNote = props.noteId && formNote.id !== props.noteId && props.editorNoteStatuses[props.noteId] === 'saving';

	const styles = styles_(props);

	const whiteBackgroundNoteRendering = formNote.markup_language === MarkupLanguage.Html;

	const markupToHtml = useMarkupToHtml({
		themeId: props.themeId,
		whiteBackgroundNoteRendering,
		customCss: props.customCss,
		plugins: props.plugins,
		scrollbarSize: props.scrollbarSize,
		baseFontFamily: props.viewerFontFamily,
	});

	const allAssets = useCallback(async (markupLanguage: number, options: AllAssetsOptions = null) => {
		options = {
			contentMaxWidthTarget: '',
			...options,
		};

		const theme = themeStyle(options.themeId ? options.themeId : props.themeId);

		const markupToHtml = markupLanguageUtils.newMarkupToHtml(props.plugins, {
			resourceBaseUrl: getResourceBaseUrl(),
			customCss: props.customCss,
		});

		return markupToHtml.allAssets(markupLanguage, theme, {
			contentMaxWidth: props.contentMaxWidth,
			contentMaxWidthTarget: options.contentMaxWidthTarget,
			scrollbarSize: props.scrollbarSize,
			baseFontFamily: props.viewerFontFamily,
			whiteBackgroundNoteRendering: options.whiteBackgroundNoteRendering,
		});
	}, [props.plugins, props.themeId, props.scrollbarSize, props.viewerFontFamily, props.customCss, props.contentMaxWidth]);

	const handleProvisionalFlag = useCallback(() => {
		if (props.isProvisional) {
			props.dispatch({
				type: 'NOTE_PROVISIONAL_FLAG_CLEAR',
				id: formNote.id,
			});
		}
	}, [props.isProvisional, formNote.id, props.dispatch]);

	const scheduleNoteListResort = useMemo(() => {
		return debounce(() => {
			// Although the note list will update automatically, it may take some time. This
			// forces an immediate update.
			props.dispatch({ type: 'NOTE_SORT' });
		}, 100);
	}, [props.dispatch]);

	useEffect(() => {
		props.onTitleChange?.(formNote.title);
	}, [formNote.title, props.onTitleChange]);

	const onFieldChange = useCallback(async (field: string, value: string, changeId = 0) => {
		if (reloadInProgress) return;
		if (!isMountedRef.current) {
			// When the component is unmounted, various actions can happen which can
			// trigger onChange events, for example the textarea might be cleared.
			// We need to ignore these events, otherwise the note is going to be saved
			// with an invalid body.
			logger.debug('Skipping change event because the component is unmounted');
			return;
		}

		handleProvisionalFlag();

		const change = field === 'body' ? {
			body: value,
		} : {
			title: value,
		};

		const newNote = {
			...formNote,
			...change,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			hasChanged: true,
		};

		if (field === 'title') {
			setTitleHasBeenManuallyChanged(true);
		}

		if (isNewNote && !titleHasBeenManuallyChanged && field === 'body') {
			// TODO: Handle HTML/Markdown format
			newNote.title = Note.defaultTitle(value);
		}

		if (changeId !== null && field === 'body' && formNote.bodyWillChangeId !== changeId) {
			// Note was changed, but another note was loaded before save - skipping
			// The previously loaded note, that was modified, will be saved via saveNoteIfWillChange()
		} else {
			setFormNote(newNote);
			await scheduleSaveNote(newNote);
		}

		if (field === 'title') {
			// Scheduling a resort needs to be:
			// - called after scheduleSaveNote so that the new note title is used for sorting
			// - debounced because many calls to scheduleSaveNote can resolve at once
			scheduleNoteListResort();
		}
	}, [reloadInProgress, handleProvisionalFlag, formNote, setFormNote, isNewNote, titleHasBeenManuallyChanged, scheduleNoteListResort, scheduleSaveNote]);

	const onDrop = useDropHandler({ editorRef });

	const onBodyChange = useCallback((event: OnChangeEvent) => onFieldChange('body', event.content, event.changeId), [onFieldChange]);

	const onTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => onFieldChange('title', event.target.value), [onFieldChange]);

	const containerRef = useRef<HTMLDivElement>(null);
	useWindowCommandHandler({
		dispatch: props.dispatch,
		setShowLocalSearch,
		noteSearchBarRef,
		editorRef,
		titleInputRef,
		onBodyChange,
		containerRef,
	});

	// const onTitleKeydown = useCallback((event:any) => {
	// 	const keyCode = event.keyCode;

	// 	if (keyCode === 9) {
	// 		// TAB
	// 		event.preventDefault();

	// 		if (event.shiftKey) {
	// 			CommandService.instance().execute('focusElement', 'noteList');
	// 		} else {
	// 			CommandService.instance().execute('focusElement', 'noteBody');
	// 		}
	// 	}
	// }, [props.dispatch]);

	const shareCache = useMemo(() => {
		return parseShareCache(props.shareCacheSetting);
	}, [props.shareCacheSetting]);

	useAsyncEffect(async event => {
		if (!formNote.id) return;

		try {
			const result = await itemIsReadOnly(BaseItem, ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, formNote.id, props.syncUserId, shareCache);
			if (event.cancelled) return;
			setIsReadOnly(result);
		} catch (error) {
			if (error.code === ErrorCode.NotFound) {
				// Can happen if the note has been deleted but a render is
				// triggered anyway. It can be ignored.
			} else {
				throw error;
			}
		}
	}, [formNote.id, props.syncUserId, shareCache]);

	const onBodyWillChange = useCallback((event: { changeId: number }) => {
		handleProvisionalFlag();

		setFormNote(prev => {
			return {
				...prev,
				bodyWillChangeId: event.changeId,
				hasChanged: true,
			};
		});

		props.dispatch({
			type: 'EDITOR_NOTE_STATUS_SET',
			id: formNote.id,
			status: 'saving',
		});
	}, [formNote, setFormNote, handleProvisionalFlag, props.dispatch]);

	const { scrollWhenReadyRef, clearScrollWhenReady } = useScrollWhenReadyOptions({
		noteId: formNote.id,
		selectedNoteHash: props.selectedNoteHash,
		editorRef,
		editorName: props.bodyEditor,
	});
	const onMessage = useMessageHandler(scrollWhenReadyRef, clearScrollWhenReady, windowId, editorRef, setLocalSearchResultCount, props.dispatch, formNote, htmlToMarkdown, markupToHtml);

	useResourceUnwatcher({ noteId: formNote.id, windowId });

	const externalEditWatcher_noteChange = useCallback((event: { id: string; note: NoteEntity }) => {
		if (event.id === formNote.id) {
			const newFormNote = {
				...formNote,
				title: event.note.title,
				body: event.note.body,
			};

			setFormNote(newFormNote);
		}
	}, [formNote, setFormNote]);

	const onNotePropertyChange = useCallback((event: { note: NoteEntity }) => {
		setFormNote(formNote => {
			if (formNote.id !== event.note.id) return formNote;

			const newFormNote: FormNote = { ...formNote };

			const noteAsRecord = event.note as unknown as Record<string, unknown>;
			for (const key in noteAsRecord) {
				if (key === 'id') continue;
				(newFormNote as unknown as Record<string, unknown>)[key] = noteAsRecord[key];
			}

			return newFormNote;
		});
	}, [setFormNote]);

	useEffect(() => {
		eventManager.on(EventName.AlarmChange, onNotePropertyChange);
		ExternalEditWatcher.instance().on('noteChange', externalEditWatcher_noteChange);

		return () => {
			eventManager.off(EventName.AlarmChange, onNotePropertyChange);
			ExternalEditWatcher.instance().off('noteChange', externalEditWatcher_noteChange);
		};
	}, [externalEditWatcher_noteChange, onNotePropertyChange]);

	useEffect(() => {
		const dependencies = {
			setShowRevisions,
			isInFocusedDocument: () => {
				return containerRef.current?.ownerDocument?.hasFocus();
			},
		};

		const registeredCommands = CommandService.instance().componentRegisterCommands(
			dependencies,
			commands,
			true,
		);

		return () => {
			registeredCommands.deregister();
		};
	}, [setShowRevisions]);

	const onScroll = useCallback((event: { percent: number }) => {
		const noteId = formNoteRef.current.id;
		NotePositionService.instance().updateScrollPosition(noteId, windowId, event.percent);
	}, [windowId]);

	const onCursorMotion = useCallback((location: EditorCursorLocations) => {
		const noteId = formNoteRef.current.id;
		NotePositionService.instance().updateCursorPosition(noteId, windowId, location);
	}, [windowId]);

	function renderNoNotes(rootStyle: React.CSSProperties) {
		const emptyDivStyle = {
			backgroundColor: 'black',
			opacity: 0.1,
			...rootStyle,
		};
		return <div style={emptyDivStyle} ref={containerRef}></div>;
	}

	const searchMarkers = useSearchMarkers({
		showLocalSearch,
		localSearchMarkerOptions,
		noteId: props.noteId,
		searchResults: props.searchResults,
		searchId: props.selectedSearchId,
		searches: props.searches,
		highlightedWords: props.highlightedWords,
		noteTitle: formNote.title,
	});
	const initialCursorLocation = useInitialCursorLocation({
		noteId: props.noteId,
	});

	const markupLanguage = formNote.markup_language;
	const editorProps: NoteBodyEditorPropsAndRef = {
		ref: editorRef,
		contentKey: formNote.id,
		style: styles.tinyMCE,
		whiteBackgroundNoteRendering,
		onChange: onBodyChange,
		onWillChange: onBodyWillChange,
		onMessage: onMessage,
		content: formNote.body,
		contentMarkupLanguage: markupLanguage,
		contentOriginalCss: formNote.originalCss,
		editorNoteReloadTimeRequest: props.editorNoteReloadTimeRequest,
		initialCursorLocation,
		resourceInfos: resourceInfos,
		resourceDirectory: Setting.value('resourceDir'),
		htmlToMarkdown: htmlToMarkdown,
		markupToHtml: markupToHtml,
		allAssets: allAssets,
		disabled: isReadOnly || reloadInProgress,
		themeId: props.themeId,
		dispatch: props.dispatch,
		noteToolbar: null,
		onScroll: onScroll,
		onCursorMotion,
		setLocalSearchResultCount: setLocalSearchResultCount,
		setLocalSearch: localSearch_change,
		setShowLocalSearch,
		useLocalSearch: showLocalSearch,
		searchMarkers: searchMarkers,
		visiblePanes: props.noteVisiblePanes || ['editor', 'viewer'],
		keyboardMode: Setting.value('editor.keyboardMode'),
		enableTextPatterns: Setting.value('editor.enableTextPatterns'),
		tabMovesFocus: props.tabMovesFocus,
		locale: Setting.value('locale'),
		onDrop: onDrop,
		noteToolbarButtonInfos: props.toolbarButtonInfos,
		plugins: props.plugins,
		// KaTeX isn't supported in HTML notes
		mathEnabled: markupLanguage === MarkupLanguage.Markdown && Setting.value('markdown.plugin.katex'),
		fontSize: Setting.value('style.editor.fontSize'),
		contentMaxWidth: props.contentMaxWidth,
		scrollbarSize: props.scrollbarSize,
		baseFontFamily: props.viewerFontFamily,
		isSafeMode: props.isSafeMode,
		useCustomPdfViewer: props.useCustomPdfViewer,
		// We need it to identify the context for which media is rendered.
		// It is currently used to remember pdf scroll position for each attachments of each note uniquely.
		// Use the form note object to ensure the editor is associated with the loaded form note until onBeforeLoad
		// has flushed any pending changes from it.
		noteId: formNote.id,
		watchedNoteFiles: props.watchedNoteFiles,
		enableHtmlToMarkdownBanner: props.enableHtmlToMarkdownBanner,
		showNoteLinkIcon: props.showNoteLinkIcon,
	};

	let editor = null;

	const noteHasWhiteboardFence = markupLanguage === MarkupLanguage.Markdown
		&& hasWhiteboardFence(formNote.body);

	const useWhiteboardEditor = builtInEditorVisible
		&& noteHasWhiteboardFence
		&& !props.whiteboardForceMarkdown?.[formNote.id];

	// Mirror "active note is a whiteboard" to redux so the NoteToolbar can
	// show the editor toggle. We can't compute this from the redux note list
	// because note bodies aren't in the preview fields.
	useEffect(() => {
		props.dispatch({ type: 'WHITEBOARD_ACTIVE_NOTE_SET', value: noteHasWhiteboardFence });
	}, [noteHasWhiteboardFence, props.dispatch]);

	if (useWhiteboardEditor) {
		editor = <WhiteboardEditor key={formNote.id} {...editorProps}/>;
	} else if (builtInEditorVisible) {
		if (props.bodyEditor === 'TinyMCE') {
			editor = <TinyMCE {...editorProps}/>;
		} else if (props.bodyEditor === 'PlainText') {
			editor = <PlainEditor {...editorProps}/>;
		} else if (props.bodyEditor === 'CodeMirror5') {
			editor = <CodeMirror5 {...editorProps}/>;
		} else if (props.bodyEditor === 'CodeMirror6') {
			editor = <CodeMirror6 {...editorProps}/>;
		} else {
			throw new Error(`Invalid editor: ${props.bodyEditor}`);
		}
	}

	const noteRevisionViewer_onBack = useCallback(() => {
		setShowRevisions(false);
	}, []);

	const onBannerConvertItToMarkdown = useCallback(async (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		if (!props.selectedNoteIds || props.selectedNoteIds.length === 0) return;
		await CommandService.instance().execute('convertNoteToMarkdown', props.selectedNoteIds[0]);
	}, [props.selectedNoteIds]);

	const onHideBannerConvertItToMarkdown = async (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		Setting.setValue('editor.enableHtmlToMarkdownBanner', false);
	};

	const onBannerResourceClick = useCallback(async (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		const resourceId = event.currentTarget.getAttribute('data-resource-id');
		await openItemById(resourceId, props.dispatch);
	}, [props.dispatch]);

	if (showRevisions) {
		const theme = themeStyle(props.themeId);

		const revStyle: React.CSSProperties = {
			// ...props.style,
			display: 'inline-flex',
			padding: theme.margin,
			verticalAlign: 'top',
			boxSizing: 'border-box',
			flex: 1,
			overflowX: 'scroll',
		};

		return (
			<div style={revStyle} ref={containerRef}>
				<NoteRevisionViewer customCss={props.customCss} noteId={formNote.id} onBack={noteRevisionViewer_onBack} />
			</div>
		);
	}

	if (props.selectedNoteIds.length > 1) {
		return <MultiNoteActions
			themeId={props.themeId}
			selectedNoteIds={props.selectedNoteIds}
			notes={props.notes}
			dispatch={props.dispatch}
			watchedNoteFiles={props.watchedNoteFiles}
			plugins={props.plugins}
			inConflictFolder={props.selectedFolderId === Folder.conflictFolderId()}
			customCss={props.customCss}
		/>;
	}

	function renderSearchBar() {
		if (!showLocalSearch) return false;

		const theme = themeStyle(props.themeId);

		return (
			<NoteSearchBar
				ref={noteSearchBarRef}
				themeId={props.themeId}
				style={{
					display: 'flex',
					height: 35,
					borderTop: `1px solid ${theme.dividerColor}`,
				}}
				query={localSearch.query}
				searching={localSearch.searching}
				resultCount={localSearch.resultCount}
				selectedIndex={localSearch.selectedIndex}
				onChange={localSearch_change}
				onNext={localSearch_next}
				onPrevious={localSearch_previous}
				onClose={localSearch_close}
				visiblePanes={props.noteVisiblePanes}
				editorType={props.bodyEditor}
			/>
		);
	}

	function renderResourceWatchingNotification() {
		if (!Object.keys(props.watchedResources).length) return null;
		const resourceTitles = Object.keys(props.watchedResources).map(id => (props.watchedResources[id] as { title: string }).title);
		return (
			<div style={styles.resourceWatchBanner}>
				<p style={styles.resourceWatchBannerLine}>{_('The following attachments are being watched for changes:')} <strong>{resourceTitles.join(', ')}</strong></p>
				<p style={{ ...styles.resourceWatchBannerLine, marginBottom: 0 }}>{_('The attachments will no longer be watched when you switch to a different note.')}</p>
			</div>
		);
	}

	const renderResourceInSearchResultsNotification = () => {
		const resourceResults = props.searchResults.filter(r => r.id === props.noteId && r.item_type === ModelType.Resource);
		if (!resourceResults.length) return null;

		const renderResource = (id: string, title: string) => {
			return <li key={id}><a data-resource-id={id} onClick={onBannerResourceClick} href="#">{title}</a></li>;
		};

		return (
			<div style={styles.resourceWatchBanner}>
				<p style={styles.resourceWatchBannerLine}>{_n('The following attachment matches your search query:', 'The following attachments match your search query:', resourceResults.length)}</p>
				<ul>
					{resourceResults.map(r => renderResource(r.item_id, r.title))}
				</ul>
			</div>
		);
	};

	function renderSearchInfo() {
		const theme = themeStyle(props.themeId);
		if (formNoteFolder && ['Search', 'Tag', 'SmartFilter'].includes(props.notesParentType)) {
			return (
				<div style={{ paddingTop: 10, paddingBottom: 10, paddingLeft: theme.editorPaddingLeft }}>
					<Button
						iconName="icon-notebooks"
						level={ButtonLevel.Primary}
						title={_('In: %s', substrWithEllipsis(formNoteFolder.title, 0, 100))}
						onClick={() => {
							props.dispatch({
								type: 'FOLDER_AND_NOTE_SELECT',
								folderId: formNoteFolder.id,
								noteId: formNote.id,
							});
						}}
					/>
					<div style={{ flex: 1 }}></div>
				</div>
			);
		} else {
			return null;
		}
	}

	const renderPluginEditor = () => {
		if (!editorPlugin) return null;

		const html = props.pluginHtmlContents[editorPlugin.id]?.[editorView.id] ?? '';

		return <UserWebview
			key={editorView.id}
			viewId={editorView.id}
			themeId={props.themeId}
			html={html}
			scripts={editorView.scripts}
			pluginId={editorPlugin.id}
			borderBottom={true}
			fitToContent={false}
		/>;
	};

	// A locked note has no form note while the session is locked (see loadNoteForForm), so the
	// panel is driven by the note metadata. A loaded form note stays mounted on lock only if it
	// has unsaved changes, so they are not thrown away.
	const lockedNoteMetadata = isNoteLockEnabled() && effectiveNoteId ? props.notes.find(n => n.id === effectiveNoteId) : null;
	if (lockedNoteMetadata?.is_locked) {
		// The session is unlocked but the note content failed to decrypt (e.g. it was encrypted
		// prior to a password reset) - locking the session again shows the regular unlock panel.
		if (decryptFailed && props.noteLockSessionUnlocked) {
			return (
				<div style={styles.root} ref={containerRef}>
					<NoteLockPanel
						noteTitle={lockedNoteMetadata.title}
						hasNoteLockKey={props.hasNoteLockKey}
						dispatch={props.dispatch}
						undecryptable={true}
					/>
				</div>
			);
		}
		const formNoteLoaded = formNote.id === effectiveNoteId;
		const showLockPanel = formNoteLoaded
			? !props.noteLockSessionUnlocked && !formNote.hasChanged
			: !props.noteLockSessionUnlocked || loadBlocked;
		if (showLockPanel) {
			return (
				<div style={styles.root} ref={containerRef}>
					<NoteLockPanel
						noteTitle={lockedNoteMetadata.title}
						hasNoteLockKey={props.hasNoteLockKey}
						dispatch={props.dispatch}
					/>
				</div>
			);
		}
	}

	if (formNote.encryption_applied || !formNote.id || !effectiveNoteId) {
		return renderNoNotes(styles.root);
	}

	const theme = themeStyle(props.themeId);

	function renderConvertHtmlToMarkdown(): React.ReactNode {
		if (!props.enableHtmlToMarkdownBanner) return null;

		const note = props.notes.find(n => n.id === props.selectedNoteIds[0]);
		if (!note) return null;
		if (note.markup_language !== MarkupLanguage.Html) return null;

		return (
			<div style={styles.resourceWatchBanner}>
				<p style={styles.resourceWatchBannerLine}>
					{_('This note is in HTML format. Convert it to Markdown to edit it more easily.')}
					&nbsp;
					<a href="#" style={styles.resourceWatchBannerAction} onClick={onBannerConvertItToMarkdown}>{`${_('Convert it')}`}</a>
					{' / '}
					<a href="#" style={styles.resourceWatchBannerAction} onClick={onHideBannerConvertItToMarkdown}>{_('Don\'t show this message again')}</a>
				</p>
			</div>
		);
	}

	return (
		<div style={styles.root} onDragOver={onDragOver} onDrop={onDrop} ref={containerRef}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				{renderConvertHtmlToMarkdown()}
				{renderResourceWatchingNotification()}
				{renderResourceInSearchResultsNotification()}
				<NoteTitleBar
					titleInputRef={titleInputRef}
					themeId={props.themeId}
					isProvisional={props.isProvisional}
					noteIsTodo={formNote.is_todo}
					noteTitle={formNote.title}
					noteUserUpdatedTime={formNote.user_updated_time}
					onTitleChange={onTitleChange}
					disabled={isReadOnly || reloadInProgress}
				/>
				{renderSearchInfo()}
				<div style={{ display: 'flex', flex: 1, paddingLeft: theme.editorPaddingLeft, maxHeight: '100%', minHeight: '0' }}>
					{editor}
					{renderPluginEditor()}
				</div>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{renderSearchBar()}
				</div>
				<StatusBar
					noteId={formNote.id}
					setTagsToolbarButtonInfo={props.setTagsToolbarButtonInfo}
					selectedNoteTags={props.selectedNoteTags}
				/>
				<WarningBanner bodyEditor={props.bodyEditor}/>
			</div>
		</div>
	);
}

interface ConnectProps {
	windowId: string;
}

// Memoized because mapStateToProps runs on every dispatch and SyncInfo parses the cached JSON.
let hasNoteLockKeyCache: { syncInfoCache: string; value: boolean } = null;
const hasNoteLockKey = (syncInfoCache: string) => {
	if (!hasNoteLockKeyCache || hasNoteLockKeyCache.syncInfoCache !== syncInfoCache) {
		hasNoteLockKeyCache = { syncInfoCache, value: !!new SyncInfo(syncInfoCache).noteLockKey };
	}
	return hasNoteLockKeyCache.value;
};

const mapStateToProps = (state: AppState, ownProps: ConnectProps) => {
	const whenClauseContext = stateToWhenClauseContext(state, { windowId: ownProps.windowId });
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);
	const noteId = stateUtils.selectedNoteId(windowState);

	let bodyEditor = windowState.editorCodeView ? NoteBodyEditorType.CodeMirror6 : NoteBodyEditorType.TinyMce;
	if (state.settings.isSafeMode) {
		bodyEditor = NoteBodyEditorType.PlainText;
	} else if (windowState.editorCodeView && state.settings['editor.legacyMarkdown']) {
		bodyEditor = NoteBodyEditorType.CodeMirror5;
	}

	const mainWindowState = stateUtils.windowStateById(state, defaultWindowId);

	return {
		noteId,
		bodyEditor,
		isProvisional: state.provisionalNoteIds.includes(noteId),
		notes: windowState.notes,
		selectedNoteIds: windowState.selectedNoteIds,
		selectedFolderId: windowState.selectedFolderId,
		editorNoteStatuses: state.editorNoteStatuses,
		themeId: state.settings.theme,
		watchedNoteFiles: state.watchedNoteFiles,
		notesParentType: windowState.notesParentType,
		selectedNoteTags: windowState.selectedNoteTags,
		selectedNoteHash: windowState.selectedNoteHash,
		searches: state.searches,
		selectedSearchId: windowState.selectedSearchId,
		customCss: state.customViewerCss,
		noteVisiblePanes: windowState.noteVisiblePanes,
		watchedResources: windowState.watchedResources,
		// For now, only the main window has search UI. Show the same search markers in all
		// windows:
		highlightedWords: mainWindowState.highlightedWords,
		plugins: state.pluginService.plugins,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons([
			'historyBackward',
			'historyForward',
			'toggleEditors',
			'toggleExternalEditing',
		], whenClauseContext),
		setTagsToolbarButtonInfo: toolbarButtonUtils.commandsToToolbarButtons([
			'setTags',
		], whenClauseContext)[0] as ToolbarButtonInfo,
		contentMaxWidth: state.settings['style.editor.contentMaxWidth'],
		scrollbarSize: state.settings['style.scrollbarSize'],
		viewerFontFamily: state.settings['style.viewer.fontFamily'],
		tabMovesFocus: state.settings['editor.tabMovesFocus'],
		isSafeMode: state.settings.isSafeMode,
		useCustomPdfViewer: false,
		syncUserId: state.settings['sync.userId'],
		shareCacheSetting: state.settings['sync.shareCache'],
		searchResults: state.searchResults,
		enableHtmlToMarkdownBanner: state.settings['editor.enableHtmlToMarkdownBanner'],
		enableInEditorRendering: state.settings['editor.inlineRendering'],
		showNoteLinkIcon: state.settings['notes.showNoteLinkIcon'],
		whiteboardForceMarkdown: windowState.whiteboardForceMarkdown ?? {},
		noteLockSessionUnlocked: state.noteLockSessionUnlocked,
		hasNoteLockKey: hasNoteLockKey(state.settings['syncInfoCache']),
		editorNoteReloadTimeRequest: windowState.windowEditorNoteReloadTimeRequest,
	};
};

export default connect(mapStateToProps)(NoteEditorContent);
