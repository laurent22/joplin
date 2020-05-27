import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import TinyMCE from './NoteBody/TinyMCE/TinyMCE';
import AceEditor  from './NoteBody/AceEditor/AceEditor';
import CodeMirror  from './NoteBody/CodeMirror/CodeMirror';
import { connect } from 'react-redux';
import MultiNoteActions from '../MultiNoteActions';
import NoteToolbar from '../NoteToolbar/NoteToolbar';
import { htmlToMarkdown, formNoteToNote } from './utils';
import useSearchMarkers from './utils/useSearchMarkers';
import useNoteSearchBar from './utils/useNoteSearchBar';
import useMessageHandler from './utils/useMessageHandler';
import useWindowCommandHandler from './utils/useWindowCommandHandler';
import useDropHandler from './utils/useDropHandler';
import useMarkupToHtml from './utils/useMarkupToHtml';
import useFormNote, { OnLoadEvent } from './utils/useFormNote';
import styles_ from './styles';
import { NoteEditorProps, FormNote, ScrollOptions, ScrollOptionTypes, OnChangeEvent, NoteBodyEditorProps } from './utils/types';

const { themeStyle } = require('../../theme.js');
const NoteSearchBar = require('../NoteSearchBar.min.js');
const { reg } = require('lib/registry.js');
const { time } = require('lib/time-utils.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const usePrevious = require('lib/hooks/usePrevious').default;
const Setting = require('lib/models/Setting');
const { _ } = require('lib/locale');
const Note = require('lib/models/Note.js');
const { bridge } = require('electron').remote.require('./bridge');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const eventManager = require('../../eventManager');
const NoteRevisionViewer = require('../NoteRevisionViewer.min');
const TagList = require('../TagList.min.js');

function NoteEditor(props: NoteEditorProps) {
	const [showRevisions, setShowRevisions] = useState(false);
	const [titleHasBeenManuallyChanged, setTitleHasBeenManuallyChanged] = useState(false);
	const [scrollWhenReady, setScrollWhenReady] = useState<ScrollOptions>(null);

	const editorRef = useRef<any>();
	const titleInputRef = useRef<any>();
	const isMountedRef = useRef(true);
	const noteSearchBarRef = useRef(null);

	const formNote_beforeLoad = useCallback(async (event:OnLoadEvent) => {
		await saveNoteIfWillChange(event.formNote);
		setShowRevisions(false);
	}, []);

	const formNote_afterLoad = useCallback(async () => {
		setTitleHasBeenManuallyChanged(false);
	}, []);

	const { formNote, setFormNote, isNewNote, resourceInfos } = useFormNote({
		syncStarted: props.syncStarted,
		noteId: props.noteId,
		isProvisional: props.isProvisional,
		titleInputRef: titleInputRef,
		editorRef: editorRef,
		onBeforeLoad: formNote_beforeLoad,
		onAfterLoad: formNote_afterLoad,
	});

	const formNoteRef = useRef<FormNote>();
	formNoteRef.current = { ...formNote };

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
	} = useNoteSearchBar();

	// If the note has been modified in another editor, wait for it to be saved
	// before loading it in this editor.
	// const waitingToSaveNote = props.noteId && formNote.id !== props.noteId && props.editorNoteStatuses[props.noteId] === 'saving';

	const styles = styles_(props);

	function scheduleSaveNote(formNote: FormNote) {
		if (!formNote.saveActionQueue) throw new Error('saveActionQueue is not set!!'); // Sanity check

		// reg.logger().debug('Scheduling...', formNote);

		const makeAction = (formNote: FormNote) => {
			return async function() {
				const note = await formNoteToNote(formNote);
				reg.logger().debug('Saving note...', note);
				const savedNote:any = await Note.save(note);

				setFormNote((prev: FormNote) => {
					return { ...prev, user_updated_time: savedNote.user_updated_time };
				});

				ExternalEditWatcher.instance().updateNoteFile(savedNote);

				props.dispatch({
					type: 'EDITOR_NOTE_STATUS_REMOVE',
					id: formNote.id,
				});
			};
		};

		formNote.saveActionQueue.push(makeAction(formNote));
	}

	async function saveNoteIfWillChange(formNote: FormNote) {
		if (!formNote.id || !formNote.bodyWillChangeId) return;

		const body = await editorRef.current.content();

		scheduleSaveNote({
			...formNote,
			body: body,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
		});
	}

	async function saveNoteAndWait(formNote: FormNote) {
		saveNoteIfWillChange(formNote);
		return formNote.saveActionQueue.waitForAllDone();
	}

	const markupToHtml = useMarkupToHtml({ themeId: props.theme, customCss: props.customCss });

	const allAssets = useCallback(async (markupLanguage: number): Promise<any[]> => {
		const theme = themeStyle(props.theme);

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		return markupToHtml.allAssets(markupLanguage, theme);
	}, [props.theme]);

	const handleProvisionalFlag = useCallback(() => {
		if (props.isProvisional) {
			props.dispatch({
				type: 'NOTE_PROVISIONAL_FLAG_CLEAR',
				id: formNote.id,
			});
		}
	}, [props.isProvisional, formNote.id]);

	useEffect(() => {
		// This is not exactly a hack but a bit ugly. If the note was changed (willChangeId > 0) but not
		// yet saved, we need to save it now before the component is unmounted. However, we can't put
		// formNote in the dependency array or that effect will run every time the note changes. We only
		// want to run it once on unmount. So because of that we need to use that formNoteRef.
		return () => {
			isMountedRef.current = false;
			saveNoteIfWillChange(formNoteRef.current);
		};
	}, []);

	const previousNoteId = usePrevious(formNote.id);

	useEffect(() => {
		if (formNote.id === previousNoteId) return;

		if (editorRef.current) {
			editorRef.current.resetScroll();
		}

		setScrollWhenReady({
			type: props.selectedNoteHash ? ScrollOptionTypes.Hash : ScrollOptionTypes.Percent,
			value: props.selectedNoteHash ? props.selectedNoteHash : props.lastEditorScrollPercents[props.noteId] || 0,
		});
	}, [formNote.id, previousNoteId]);

	const onFieldChange = useCallback((field: string, value: any, changeId = 0) => {
		if (!isMountedRef.current) {
			// When the component is unmounted, various actions can happen which can
			// trigger onChange events, for example the textarea might be cleared.
			// We need to ignore these events, otherwise the note is going to be saved
			// with an invalid body.
			reg.logger().debug('Skipping change event because the component is unmounted');
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
			scheduleSaveNote(newNote);
		}
	}, [handleProvisionalFlag, formNote, isNewNote, titleHasBeenManuallyChanged]);

	useWindowCommandHandler({ windowCommand: props.windowCommand, dispatch: props.dispatch, formNote, setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, saveNoteAndWait });

	const onDrop = useDropHandler({ editorRef });

	const onBodyChange = useCallback((event: OnChangeEvent) => onFieldChange('body', event.content, event.changeId), [onFieldChange]);

	const onTitleChange = useCallback((event: any) => onFieldChange('title', event.target.value), [onFieldChange]);

	const onTitleKeydown = useCallback((event:any) => {
		const keyCode = event.keyCode;

		if (keyCode === 9) {
			// TAB
			event.preventDefault();

			if (event.shiftKey) {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteList',
				});
			} else {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteBody',
				});
			}
		}
	}, [props.dispatch]);

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
	}, [formNote, handleProvisionalFlag]);

	const onMessage = useMessageHandler(scrollWhenReady, setScrollWhenReady, editorRef, setLocalSearchResultCount, props.dispatch, formNote);

	const introductionPostLinkClick = useCallback(() => {
		bridge().openExternal('https://www.patreon.com/posts/34246624');
	}, []);

	const externalEditWatcher_noteChange = useCallback((event) => {
		if (event.id === formNote.id) {
			const newFormNote = {
				...formNote,
				title: event.note.title,
				body: event.note.body,
			};

			setFormNote(newFormNote);
		}
	}, [formNote]);

	const onNotePropertyChange = useCallback((event) => {
		setFormNote(formNote => {
			if (formNote.id !== event.note.id) return formNote;

			const newFormNote: FormNote = { ...formNote };

			for (const key in event.note) {
				if (key === 'id') continue;
				(newFormNote as any)[key] = event.note[key];
			}

			return newFormNote;
		});
	}, []);

	useEffect(() => {
		eventManager.on('alarmChange', onNotePropertyChange);
		ExternalEditWatcher.instance().on('noteChange', externalEditWatcher_noteChange);

		return () => {
			eventManager.off('alarmChange', onNotePropertyChange);
			ExternalEditWatcher.instance().off('noteChange', externalEditWatcher_noteChange);
		};
	}, [externalEditWatcher_noteChange, onNotePropertyChange]);

	const noteToolbar_buttonClick = useCallback((event: any) => {
		const cases: any = {

			'startExternalEditing': async () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'commandStartExternalEditing',
				});
			},

			'stopExternalEditing': () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'commandStopExternalEditing',
				});
			},

			'setTags': async () => {
				await saveNoteAndWait(formNote);

				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'setTags',
					noteIds: [formNote.id],
				});
			},

			'setAlarm': async () => {
				await saveNoteAndWait(formNote);

				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'editAlarm',
					noteId: formNote.id,
				});
			},

			'showRevisions': () => {
				setShowRevisions(true);
			},
		};

		if (!cases[event.name]) throw new Error(`Unsupported event: ${event.name}`);

		cases[event.name]();
	}, [formNote]);

	const onScroll = useCallback((event: any) => {
		props.dispatch({
			type: 'EDITOR_SCROLL_PERCENT_SET',
			noteId: formNote.id,
			percent: event.percent,
		});
	}, [props.dispatch, formNote]);

	function renderNoNotes(rootStyle:any) {
		const emptyDivStyle = Object.assign(
			{
				backgroundColor: 'black',
				opacity: 0.1,
			},
			rootStyle
		);
		return <div style={emptyDivStyle}></div>;
	}

	function renderNoteToolbar() {
		const toolbarStyle = {
			marginBottom: 0,
		};

		return <NoteToolbar
			theme={props.theme}
			note={formNote}
			style={toolbarStyle}
			onButtonClick={noteToolbar_buttonClick}
		/>;
	}

	function renderTagBar() {
		return props.selectedNoteTags.length ? <TagList items={props.selectedNoteTags} /> : null;
	}

	function renderTitleBar() {
		const titleBarDate = <span style={styles.titleDate}>{time.formatMsToLocal(formNote.user_updated_time)}</span>;
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
				<input
					type="text"
					ref={titleInputRef}
					placeholder={props.isProvisional ? _('Creating new %s...', formNote.is_todo ? _('to-do') : _('note')) : ''}
					style={styles.titleInput}
					onChange={onTitleChange}
					onKeyDown={onTitleKeydown}
					value={formNote.title}
				/>
				{titleBarDate}
			</div>
		);
	}

	const searchMarkers = useSearchMarkers(showLocalSearch, localSearchMarkerOptions, props.searches, props.selectedSearchId);

	const editorProps:NoteBodyEditorProps = {
		ref: editorRef,
		contentKey: formNote.id,
		style: styles.tinyMCE,
		onChange: onBodyChange,
		onWillChange: onBodyWillChange,
		onMessage: onMessage,
		content: formNote.body,
		contentMarkupLanguage: formNote.markup_language,
		contentOriginalCss: formNote.originalCss,
		resourceInfos: resourceInfos,
		htmlToMarkdown: htmlToMarkdown,
		markupToHtml: markupToHtml,
		allAssets: allAssets,
		disabled: false,
		theme: props.theme,
		dispatch: props.dispatch,
		noteToolbar: null,// renderNoteToolbar(),
		onScroll: onScroll,
		searchMarkers: searchMarkers,
		visiblePanes: props.noteVisiblePanes || ['editor', 'viewer'],
		keyboardMode: Setting.value('editor.keyboardMode'),
		locale: Setting.value('locale'),
		onDrop: onDrop,
	};

	let editor = null;

	if (props.bodyEditor === 'TinyMCE') {
		editor = <TinyMCE {...editorProps}/>;
	} else if (props.bodyEditor === 'AceEditor') {
		editor = <AceEditor {...editorProps}/>;
	} else if (props.bodyEditor === 'CodeMirror') {
		editor = <CodeMirror {...editorProps}/>;
	} else {
		throw new Error(`Invalid editor: ${props.bodyEditor}`);
	}

	const wysiwygBanner = props.bodyEditor !== 'TinyMCE' ? null : (
		<div style={{ ...styles.warningBanner }}>
			This is an experimental WYSIWYG editor for evaluation only. Please do not use with important notes as you may lose some data! See the <a style={styles.urlColor} onClick={introductionPostLinkClick} href="#">introduction post</a> for more information. TO SWITCH TO THE MARKDOWN EDITOR PLEASE PRESS "Code View".
		</div>
	);

	const noteRevisionViewer_onBack = useCallback(() => {
		setShowRevisions(false);
	}, []);

	if (showRevisions) {
		const theme = themeStyle(props.theme);

		const revStyle = {
			...props.style,
			display: 'inline-flex',
			padding: theme.margin,
			verticalAlign: 'top',
			boxSizing: 'border-box',

		};

		return (
			<div style={revStyle}>
				<NoteRevisionViewer customCss={props.customCss} noteId={formNote.id} onBack={noteRevisionViewer_onBack} />
			</div>
		);
	}

	if (props.selectedNoteIds.length > 1) {
		return <MultiNoteActions
			theme={props.theme}
			selectedNoteIds={props.selectedNoteIds}
			notes={props.notes}
			dispatch={props.dispatch}
			watchedNoteFiles={props.watchedNoteFiles}
			style={props.style}
		/>;
	}

	function renderSearchBar() {
		if (!showLocalSearch) return false;

		const theme = themeStyle(props.theme);

		return (
			<NoteSearchBar
				ref={noteSearchBarRef}
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
			/>
		);
	}

	if (formNote.encryption_applied || !formNote.id || !props.noteId) {
		return renderNoNotes(styles.root);
	}

	return (
		<div style={styles.root} onDrop={onDrop}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				{renderTitleBar()}
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{renderNoteToolbar()}{renderTagBar()}
				</div>
				<div style={{ display: 'flex', flex: 1 }}>
					{editor}
				</div>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{renderSearchBar()}
				</div>
				{wysiwygBanner}
			</div>
		</div>
	);
}

export {
	NoteEditor as NoteEditorComponent,
};

const mapStateToProps = (state: any) => {
	const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;

	return {
		noteId: noteId,
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		isProvisional: state.provisionalNoteIds.includes(noteId),
		editorNoteStatuses: state.editorNoteStatuses,
		syncStarted: state.syncStarted,
		theme: state.settings.theme,
		watchedNoteFiles: state.watchedNoteFiles,
		windowCommand: state.windowCommand,
		notesParentType: state.notesParentType,
		selectedNoteTags: state.selectedNoteTags,
		lastEditorScrollPercents: state.lastEditorScrollPercents,
		selectedNoteHash: state.selectedNoteHash,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		customCss: state.customCss,
		noteVisiblePanes: state.noteVisiblePanes,
	};
};

export default connect(mapStateToProps)(NoteEditor);
