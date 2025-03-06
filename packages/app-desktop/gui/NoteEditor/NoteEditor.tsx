import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
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
import { NoteEditorProps, FormNote, OnChangeEvent, NoteBodyEditorProps, AllAssetsOptions, NoteBodyEditorRef } from './utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import Button, { ButtonLevel } from '../Button/Button';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import { AppState } from '../../app.reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { _, _n } from '@joplin/lib/locale';
import NoteTitleBar from './NoteTitle/NoteTitleBar';
import markupLanguageUtils from '@joplin/lib/utils/markupLanguageUtils';
import Setting from '@joplin/lib/models/Setting';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import { itemIsReadOnly } from '@joplin/lib/models/utils/readOnly';
const { themeStyle } = require('@joplin/lib/theme');
const { substrWithEllipsis } = require('@joplin/lib/string-utils');
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
import { openItemById } from './utils/contextMenu';
import { MarkupLanguage } from '@joplin/renderer';
import useScrollWhenReadyOptions from './utils/useScrollWhenReadyOptions';
import useScheduleSaveCallbacks from './utils/useScheduleSaveCallbacks';
import WarningBanner from './WarningBanner/WarningBanner';
import UserWebview from '../../services/plugins/UserWebview';
import Logger from '@joplin/utils/Logger';
import usePluginEditorView from './utils/usePluginEditorView';
import { stateUtils } from '@joplin/lib/reducer';
import { WindowIdContext } from '../NewWindowOrIFrame';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import EditorPluginHandler from '@joplin/lib/services/plugins/EditorPluginHandler';
import useResourceUnwatcher from './utils/useResourceUnwatcher';
import StatusBar from './StatusBar';

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

	const editorRef = useRef<NoteBodyEditorRef>();
	const titleInputRef = useRef<HTMLInputElement>();
	const isMountedRef = useRef(true);
	const noteSearchBarRef = useRef(null);

	const editorPluginHandler = useMemo(() => {
		return new EditorPluginHandler(PluginService.instance());
	}, []);

	const shownEditorViewIds = props['plugins.shownEditorViewIds'];

	// Should be constant and unique to this instance of the editor.
	const editorId = useMemo(() => {
		return `editor-${editorIdCounter++}`;
	}, []);

	const setFormNoteRef = useRef<OnSetFormNote>();
	const { saveNoteIfWillChange, scheduleSaveNote } = useScheduleSaveCallbacks({
		setFormNote: setFormNoteRef, dispatch: props.dispatch, editorRef, editorId,
	});
	const formNote_beforeLoad = useCallback(async (event: OnLoadEvent) => {
		await saveNoteIfWillChange(event.formNote);
		setShowRevisions(false);
	}, [saveNoteIfWillChange]);

	const formNote_afterLoad = useCallback(async () => {
		setTitleHasBeenManuallyChanged(false);
	}, []);

	const effectiveNoteId = useEffectiveNoteId(props);

	useAsyncEffect(async (_event) => {
		if (!props.startupPluginsLoaded) return;
		await editorPluginHandler.emitActivationCheck();
	}, [effectiveNoteId, editorPluginHandler, props.startupPluginsLoaded]);

	useEffect(() => {
		if (!props.startupPluginsLoaded) return;
		editorPluginHandler.emitUpdate(shownEditorViewIds);
	}, [effectiveNoteId, editorPluginHandler, shownEditorViewIds, props.startupPluginsLoaded]);

	const { editorPlugin, editorView } = usePluginEditorView(props.plugins, shownEditorViewIds);
	const builtInEditorVisible = !editorPlugin;

	const { formNote, setFormNote, isNewNote, resourceInfos } = useFormNote({
		noteId: effectiveNoteId,
		isProvisional: props.isProvisional,
		titleInputRef: titleInputRef,
		editorRef: editorRef,
		onBeforeLoad: formNote_beforeLoad,
		onAfterLoad: formNote_afterLoad,
		builtInEditorVisible,
		editorId,
	});
	setFormNoteRef.current = setFormNote;
	const formNoteRef = useRef<FormNote>();
	formNoteRef.current = { ...formNote };

	const formNoteFolder = useFolder({ folderId: formNote.parent_id });

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
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const allAssets = useCallback(async (markupLanguage: number, options: AllAssetsOptions = null): Promise<any[]> => {
		options = {
			contentMaxWidthTarget: '',
			...options,
		};

		const theme = themeStyle(options.themeId ? options.themeId : props.themeId);

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({}, {
			resourceBaseUrl: `joplin-content://note-viewer/${Setting.value('resourceDir')}/`,
			customCss: props.customCss,
		});

		return markupToHtml.allAssets(markupLanguage, theme, {
			contentMaxWidth: props.contentMaxWidth,
			contentMaxWidthTarget: options.contentMaxWidthTarget,
			scrollbarSize: props.scrollbarSize,
			whiteBackgroundNoteRendering: options.whiteBackgroundNoteRendering,
		});
	}, [props.themeId, props.scrollbarSize, props.customCss, props.contentMaxWidth]);

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onFieldChange = useCallback(async (field: string, value: any, changeId = 0) => {
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
	}, [handleProvisionalFlag, formNote, setFormNote, isNewNote, titleHasBeenManuallyChanged, scheduleNoteListResort, scheduleSaveNote]);

	const onDrop = useDropHandler({ editorRef });

	const onBodyChange = useCallback((event: OnChangeEvent) => onFieldChange('body', event.content, event.changeId), [onFieldChange]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onTitleChange = useCallback((event: any) => onFieldChange('title', event.target.value), [onFieldChange]);

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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onBodyWillChange = useCallback((event: any) => {
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

	const { scrollWhenReady, clearScrollWhenReady } = useScrollWhenReadyOptions({
		noteId: formNote.id,
		selectedNoteHash: props.selectedNoteHash,
		lastEditorScrollPercents: props.lastEditorScrollPercents,
		editorRef,
	});
	const windowId = useContext(WindowIdContext);
	const onMessage = useMessageHandler(scrollWhenReady, clearScrollWhenReady, windowId, editorRef, setLocalSearchResultCount, props.dispatch, formNote, htmlToMarkdown, markupToHtml);

	useResourceUnwatcher({ noteId: formNote.id, windowId });

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const externalEditWatcher_noteChange = useCallback((event: any) => {
		if (event.id === formNote.id) {
			const newFormNote = {
				...formNote,
				title: event.note.title,
				body: event.note.body,
			};

			setFormNote(newFormNote);
		}
	}, [formNote, setFormNote]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onNotePropertyChange = useCallback((event: any) => {
		setFormNote(formNote => {
			if (formNote.id !== event.note.id) return formNote;

			const newFormNote: FormNote = { ...formNote };

			for (const key in event.note) {
				if (key === 'id') continue;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(newFormNote as any)[key] = event.note[key];
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
		props.dispatch({
			type: 'EDITOR_SCROLL_PERCENT_SET',
			// In callbacks of setTimeout()/setInterval(), props/state cannot be used
			// to refer the current value, since they would be one or more generations old.
			// For the purpose, useRef value should be used.
			noteId: formNoteRef.current.id,
			percent: event.percent,
		});
	}, [props.dispatch]);

	function renderNoNotes(rootStyle: React.CSSProperties) {
		const emptyDivStyle = {
			backgroundColor: 'black',
			opacity: 0.1,
			...rootStyle,
		};
		return <div style={emptyDivStyle} ref={containerRef}></div>;
	}

	const searchMarkers = useSearchMarkers(showLocalSearch, localSearchMarkerOptions, props.searches, props.selectedSearchId, props.highlightedWords);

	const editorProps: NoteBodyEditorProps = {
		ref: editorRef,
		contentKey: formNote.id,
		style: styles.tinyMCE,
		whiteBackgroundNoteRendering,
		onChange: onBodyChange,
		onWillChange: onBodyWillChange,
		onMessage: onMessage,
		content: formNote.body,
		contentMarkupLanguage: formNote.markup_language,
		contentOriginalCss: formNote.originalCss,
		resourceInfos: resourceInfos,
		resourceDirectory: Setting.value('resourceDir'),
		htmlToMarkdown: htmlToMarkdown,
		markupToHtml: markupToHtml,
		allAssets: allAssets,
		disabled: isReadOnly,
		themeId: props.themeId,
		dispatch: props.dispatch,
		noteToolbar: null,
		onScroll: onScroll,
		setLocalSearchResultCount: setLocalSearchResultCount,
		setLocalSearch: localSearch_change,
		setShowLocalSearch,
		useLocalSearch: showLocalSearch,
		searchMarkers: searchMarkers,
		visiblePanes: props.noteVisiblePanes || ['editor', 'viewer'],
		keyboardMode: Setting.value('editor.keyboardMode'),
		tabMovesFocus: props.tabMovesFocus,
		locale: Setting.value('locale'),
		onDrop: onDrop,
		noteToolbarButtonInfos: props.toolbarButtonInfos,
		plugins: props.plugins,
		fontSize: Setting.value('style.editor.fontSize'),
		contentMaxWidth: props.contentMaxWidth,
		scrollbarSize: props.scrollbarSize,
		isSafeMode: props.isSafeMode,
		useCustomPdfViewer: props.useCustomPdfViewer,
		// We need it to identify the context for which media is rendered.
		// It is currently used to remember pdf scroll position for each attachments of each note uniquely.
		noteId: props.noteId,
		watchedNoteFiles: props.watchedNoteFiles,
	};

	let editor = null;

	if (builtInEditorVisible) {
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
		const resourceTitles = Object.keys(props.watchedResources).map(id => props.watchedResources[id].title);
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

	if (formNote.encryption_applied || !formNote.id || !effectiveNoteId) {
		return renderNoNotes(styles.root);
	}

	const theme = themeStyle(props.themeId);

	return (
		<div style={styles.root} onDragOver={onDragOver} onDrop={onDrop} ref={containerRef}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
					disabled={isReadOnly}
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

const mapStateToProps = (state: AppState, ownProps: ConnectProps) => {
	const whenClauseContext = stateToWhenClauseContext(state, { windowId: ownProps.windowId });
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);
	const noteId = stateUtils.selectedNoteId(windowState);

	let bodyEditor = windowState.editorCodeView ? 'CodeMirror6' : 'TinyMCE';
	if (state.settings.isSafeMode) {
		bodyEditor = 'PlainText';
	} else if (windowState.editorCodeView && state.settings['editor.legacyMarkdown']) {
		bodyEditor = 'CodeMirror5';
	}

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
		lastEditorScrollPercents: state.lastEditorScrollPercents,
		selectedNoteHash: windowState.selectedNoteHash,
		searches: state.searches,
		selectedSearchId: windowState.selectedSearchId,
		customCss: state.customViewerCss,
		noteVisiblePanes: windowState.noteVisiblePanes,
		watchedResources: windowState.watchedResources,
		highlightedWords: state.highlightedWords,
		plugins: state.pluginService.plugins,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		'plugins.shownEditorViewIds': state.settings['plugins.shownEditorViewIds'] || [],
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
		tabMovesFocus: state.settings['editor.tabMovesFocus'],
		isSafeMode: state.settings.isSafeMode,
		useCustomPdfViewer: false,
		syncUserId: state.settings['sync.userId'],
		shareCacheSetting: state.settings['sync.shareCache'],
		searchResults: state.searchResults,
	};
};

export default connect(mapStateToProps)(NoteEditorContent);
