import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';

// eslint-disable-next-line no-unused-vars
import TinyMCE, { editorContentToHtml, OnChangeEvent } from './TinyMCE';
import { connect } from 'react-redux';
import AsyncActionQueue from '../lib/AsyncActionQueue';
import MultiNoteActions from './MultiNoteActions';

// eslint-disable-next-line no-unused-vars
import { DefaultEditorState } from './utils/NoteText';
const { themeStyle, buildStyle } = require('../theme.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const Setting = require('lib/models/Setting');
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToMd = require('lib/HtmlToMd');
const { _ } = require('lib/locale');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const { shim } = require('lib/shim');
const { bridge } = require('electron').remote.require('./bridge');

// Note: Data from the editor is currently processed and saved this way:
//
// 1. TinyMCE triggers the onChange event if the user stops typing for 500ms
// 2. NoteText2 receives this event, update formNote and schedule a save operation
// 3. The note is saved after several ms depending on how AsyncActionQueue is configured
//
// This means that if the user types something, then switch to another note within
// less than 500ms, the changes will be lost. It's relatively rare case but it could happen.
//
// The delay between scheduling save and actual saving on the other hand is not an issue
// because when scheduling the complete state is saved to a variable, which is then
// used to save to the database. So even if the component is unmounted, saving will
// still happen in the background.
//
// New notes don't have an ID and can be more of a problem, this is why they are saved
// immediately (no scheduling) once the user starts modifying it so that we have an ID
// to work with.

// TODO: as soon as note change, clear provisional flag
// TODO: preserve image size
// TODO: handle HTML notes
// TODO: add indicator showing that note has been saved or not
//       from TinyMCE, emit willChange event, which means we know we're expecting changes
// TODO: Handle template
// TODO: document willChange/change event and changeId

interface NoteTextProps {
	style: any,
	noteId: string,
	theme: number,
	dispatch: Function,
	selectedNoteIds: string[],
	notes:any[],
	watchedNoteFiles:string[],
	isProvisional: boolean,
}

interface FormNote {
	id: string,
	title: string,
	parent_id: string,
	is_todo: number,
	bodyEditorContent?: any,
	bodyWillChangeId: number
	bodyChangeId: number,
	saveActionQueue: AsyncActionQueue,
}

const defaultNote = ():FormNote => {
	return {
		id: '',
		parent_id: '',
		title: '',
		is_todo: 0,
		bodyWillChangeId: 0,
		bodyChangeId: 0,
		saveActionQueue: null,
	};
};

function styles_(props:NoteTextProps) {
	return buildStyle('NoteText', props.theme, (theme:any) => {
		return {
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				paddingBottom: 5,
				paddingLeft: 8,
				paddingRight: 8,
				marginRight: theme.paddingLeft,
				color: theme.textStyle.color,
				fontSize: theme.textStyle.fontSize * 1.25 *1.5,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
			},
			warningBanner: {
				background: theme.warningBackgroundColor,
				fontFamily: theme.fontFamily,
				padding: 10,
				fontSize: theme.fontSize,
			},
			tinyMCE: {
				width: '100%',
				height: '100%',
			},
		};
	});
}

async function htmlToMarkdown(html:string):Promise<string> {
	const htmlToMd = new HtmlToMd();
	let md = htmlToMd.parse(html);
	md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
	return md;
}

async function formNoteToNote(formNote:FormNote):Promise<any> {
	const newNote:any = Object.assign({}, formNote);

	if ('bodyEditorContent' in formNote) {
		const html = await editorContentToHtml(formNote.bodyEditorContent);
		newNote.body = await htmlToMarkdown(html);
	}

	delete newNote.bodyEditorContent;

	return newNote;
}

async function attachResources() {
	const filePaths = bridge().showOpenDialog({
		properties: ['openFile', 'createDirectory', 'multiSelections'],
	});
	if (!filePaths || !filePaths.length) return [];

	const output = [];

	for (const filePath of filePaths) {
		try {
			const resource = await shim.createResourceFromPath(filePath);
			output.push({
				item: resource,
				markdownTag: Resource.markdownTag(resource),
			});
		} catch (error) {
			bridge().showErrorMessageBox(error.message);
		}
	}

	return output;
}

function scheduleSaveNote(formNote:FormNote) {
	if (!formNote.saveActionQueue) throw new Error('saveActionQueue is not set!!'); // Sanity check

	console.info('Scheduling...', formNote);

	const makeAction = (formNote:FormNote) => {
		return async function() {
			const note = await formNoteToNote(formNote);
			console.info('Saving note...', note);
			await Note.save(note);
		};
	};

	formNote.saveActionQueue.push(makeAction(formNote));
}

function saveNoteIfWillChange(formNote:FormNote, editorRef:any) {
	if (!formNote.id || !formNote.bodyWillChangeId) return;

	scheduleSaveNote({
		...formNote,
		bodyEditorContent: editorRef.current.content(),
		bodyWillChangeId: 0,
		bodyChangeId: 0,
	});
}

function NoteText2(props:NoteTextProps) {
	const [formNote, setFormNote] = useState<FormNote>(defaultNote());
	const [defaultEditorState, setDefaultEditorState] = useState<DefaultEditorState>({ markdown: '' });

	const editorRef = useRef<any>();
	const formNoteRef = useRef<FormNote>();
	formNoteRef.current = { ...formNote };

	const styles = styles_(props);

	const markdownToHtml = useCallback(async (md:string, options:any = null):Promise<any> => {
		md = md || '';

		const theme = themeStyle(props.theme);

		md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, theme, Object.assign({}, {
			codeTheme: theme.codeThemeCss,
			// userCss: this.props.customCss ? this.props.customCss : '',
			// resources: await shared.attachedResources(noteBody),
			resources: [],
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
		}, options));

		return result;
	}, [props.theme]);

	useEffect(() => {
		// This is not exactly a hack but a bit ugly. If the note was changed (willChangeId > 0) but not
		// yet saved, we need to save it now before the component is unmounted. However, we can't put
		// formNote in the dependency array or that effect will run every time the note changes. We only
		// want to run it once on unmount. So because of that we need to use that formNoteRef.
		return () => {
			saveNoteIfWillChange(formNoteRef.current, editorRef);
		};
	}, []);

	useEffect(() => {
		if (!props.noteId) return () => {};

		if (formNote.id === props.noteId) return () => {};

		let cancelled = false;

		console.info('Loading existing note', props.noteId);

		saveNoteIfWillChange(formNote, editorRef);

		const loadNote = async () => {
			const n = await Note.load(props.noteId);
			if (cancelled) return;

			if (!n) throw new Error(`Cannot find note with ID: ${props.noteId}`);

			setFormNote({
				id: n.id,
				title: n.title,
				is_todo: n.is_todo,
				parent_id: n.parent_id,
				bodyWillChangeId: 0,
				bodyChangeId: 0,
				saveActionQueue: new AsyncActionQueue(2000),
			});

			setDefaultEditorState({ markdown: n.body });
		};

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [props.noteId, formNote]);

	const onFieldChange = useCallback((field:string, value:any, changeId: number = 0) => {
		const change = field === 'body' ? {
			bodyEditorContent: value,
		} : {
			title: value,
		};

		setFormNote(prev => {
			return {
				...prev,
				...change,
				bodyChangeId: changeId,
			};
		});
	}, []);

	useEffect(() => {
		if (!formNote.bodyChangeId) return;

		if (formNote.bodyWillChangeId !== formNote.bodyChangeId) {
			console.info('Note was changed, but another note was loaded before save - skipping', formNote);
		} else {
			console.info('Saving: bodyChangeId');
			const newNote = { ...formNote, bodyWillChangeId: 0, bodyChangeId: 0 };
			setFormNote(newNote);
			scheduleSaveNote(newNote);
		}
	}, [formNote]);

	const onBodyChange = useCallback((event:OnChangeEvent) => onFieldChange('body', event.content, event.changeId), [onFieldChange]);

	const onTitleChange = useCallback((event:any) => onFieldChange('title', event.target.value), [onFieldChange]);

	const onBodyWillChange = (event:any) => {
		setFormNote(prev => {
			return { ...prev, bodyWillChangeId: event.changeId };
		});
	};

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

	return (
		<div style={props.style}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				<div style={styles.warningBanner}>
					This is an experimental WYSIWYG editor for evaluation only. Please do not use with important notes as you may lose some data! See the <a href="https://www.patreon.com/posts/34246624">introduction post</a> for more information.
				</div>
				<div style={{ display: 'flex' }}>
					<input
						type="text"
						placeholder={props.isProvisional ? _('Creating new %s...', formNote.is_todo ? _('to-do') : _('note')) : ''}
						style={styles.titleInput}
						onChange={onTitleChange}
						value={formNote.title}
					/>
				</div>
				<div style={{ display: 'flex', flex: 1 }}>
					<TinyMCE
						ref={editorRef}
						style={styles.tinyMCE}
						onChange={onBodyChange}
						onWillChange={onBodyWillChange}
						defaultEditorState={defaultEditorState}
						markdownToHtml={markdownToHtml}
						attachResources={attachResources}
					/>
				</div>
			</div>
		</div>

	);
}

const mapStateToProps = (state:any) => {
	const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;

	return {
		noteId: noteId,
		notes: state.notes,
		selectedNoteIds: state.selectedNoteIds,
		isProvisional: state.provisionalNoteIds.includes(noteId),
		// selectedNoteHash: state.selectedNoteHash,
		// noteTags: state.selectedNoteTags,
		// folderId: state.selectedFolderId,
		// itemType: state.selectedItemType,
		// folders: state.folders,
		theme: state.settings.theme,
		// syncStarted: state.syncStarted,
		// windowCommand: state.windowCommand,
		// notesParentType: state.notesParentType,
		// searches: state.searches,
		// selectedSearchId: state.selectedSearchId,
		watchedNoteFiles: state.watchedNoteFiles,
		// customCss: state.customCss,
		// lastEditorScrollPercents: state.lastEditorScrollPercents,
		// historyNotes: state.historyNotes,
		// templates: state.templates,
	};
};

export default connect(mapStateToProps)(NoteText2);
