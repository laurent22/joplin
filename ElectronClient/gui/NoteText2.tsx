import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import TinyMCE, { editorStateToHtml } from './TinyMCE';
import { connect } from 'react-redux';
import AsyncActionQueue from '../lib/AsyncActionQueue';
import MultiNoteActions from './MultiNoteActions';
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

// TODO: change note, switch to another note before save => broken
// TODO: preserve image size
// TODO: handle HTML notes
// TODO: handle switching layout when note hasn't saved yet

interface NoteTextProps {
	style: any,
	noteId: string,
	theme: number,
	newNote: any,
	dispatch: Function,
	selectedNoteIds: string[],
	notes:any[],
	watchedNoteFiles:string[],
}

interface FormNote {
	id: string,
	title: string,
	parent_id: string,
	is_todo: number,
	bodyMarkdown: string,
	bodyEditorState?: any,
	fromNewNote: any,
}

const defaultNote = ():FormNote => {
	return {
		id: '',
		parent_id: '',
		title: '',
		bodyMarkdown: '',
		is_todo: 0,
		fromNewNote: null,
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
		};
	});
}

const saveNoteActionQueue = new AsyncActionQueue(1000);

function NoteText2(props:NoteTextProps) {
	const [formNote, setFormNote] = useState<FormNote>(defaultNote());

	const style = styles_(props);

	const htmlToMarkdown = useCallback(async (html:string):Promise<string> => {
		const htmlToMd = new HtmlToMd();
		let md = htmlToMd.parse(html);
		md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
		return md;
	}, []);

	const formNoteToNote = async (formNote:FormNote):Promise<any> => {
		const newNote:any = Object.assign({}, formNote);

		if ('bodyEditorState' in formNote) {
			const html = await editorStateToHtml(formNote.bodyEditorState);
			newNote.body = await htmlToMarkdown(html);
		}

		delete newNote.bodyMarkdown;
		delete newNote.bodyEditorState;
		delete newNote.fromNewNote;

		return newNote;
	};

	const saveNoteNow = useCallback(async (fn:FormNote = null) => {
		scheduleSaveNote(fn ? fn : formNote);
		return saveNoteActionQueue.waitForAllDone();
	}, [formNote]);

	const scheduleSaveNote = (formNote:FormNote) => {
		console.info('Scheduling...', formNote);
		const makeAction = (formNote:FormNote) => {
			return async function() {
				const note = await formNoteToNote(formNote);
				console.info('Saving note...', note);
				const result = await Note.save(note);
				if (!formNote.id) {
					setFormNote(Object.assign({}, formNote, { id: result.id }));

					props.dispatch({
						type: 'NOTE_SELECT',
						id: result.id,
					});
				}
			};
		};

		saveNoteActionQueue.push(makeAction(formNote));
	};

	const markdownToHtml = useCallback(async (md:string, options:any = null):Promise<any> => {
		const theme = themeStyle(props.theme);

		// console.info('===================================');
		// console.info('Markdown', md);

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

		// console.info('RESULT', result);
		// console.info('===================================');

		return result;
	}, [props.theme]);

	useEffect(() => {
		let cancelled = false;

		if (props.noteId && formNote.id !== props.noteId && !props.newNote) {
			async function fetchNote() {
				console.info('Load existing', props.noteId);
				const n = await Note.load(props.noteId);
				if (cancelled) return;

				if (!n) throw new Error(`Cannot find note with ID: ${props.noteId}`);

				setFormNote({
					id: n.id,
					title: n.title,
					is_todo: n.is_todo,
					bodyMarkdown: n.body,
					parent_id: n.parent_id,
					fromNewNote: null,
				});
			}

			fetchNote();
		}

		return () => {
			cancelled = true;
			if (formNote.id) saveNoteNow();
		};
	}, [props.noteId, formNote]);

	useEffect(() => {
		if (props.newNote && props.newNote === formNote.fromNewNote) {
			console.info('Create new');

			setFormNote({
				id: null,
				parent_id: props.newNote.parent_id,
				is_todo: props.newNote.is_todo,
				title: '',
				bodyMarkdown: '',
				fromNewNote: props.newNote,
			});
		}

		// TODO: if (note.template) note.body = TemplateUtils.render(note.template);

		return () => {
			if (formNote.id) saveNoteNow();
		};
	}, [props.newNote, formNote]);

	const attachResources = useCallback(async () => {
		const filePaths = bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return [];

		await saveNoteNow();

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
	}, [formNote]);

	const onFieldChange = useCallback((field:string, value:any) => {
		const change = field === 'body' ? {
			bodyEditorState: value,
		} : {
			title: value,
		};

		const newNote = Object.assign({}, formNote, change);

		setFormNote(newNote);

		if (!newNote.id) {
			saveNoteNow(newNote);
		} else {
			scheduleSaveNote(newNote);
		}
	}, [formNote]);

	const onBodyChange = (event:any) => onFieldChange('body', event.editorState);

	const onTitleChange = (event:any) => onFieldChange('title', event.target.value);

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
				<div style={style.warningBanner}>
					This is an experimental WYSIWYG editor for evaluation only. Please do not use with important notes as you may lose some data! See the <a href="https://www.patreon.com/posts/34246624">introduction post</a> for more information.
				</div>
				<div style={{ display: 'flex' }}>
					<input
						type="text"
						placeholder={props.newNote ? _('Creating new %s...', formNote.is_todo ? _('to-do') : _('note')) : ''}
						style={style.titleInput}
						onChange={onTitleChange}
						value={formNote.title}
					/>
				</div>
				<div style={{ display: 'flex', flex: 1 }}>
					<TinyMCE
						style={{ width: '100%', height: '100%' }}
						onChange={onBodyChange}
						defaultMarkdown={formNote.bodyMarkdown}
						theme={props.theme}
						markdownToHtml={markdownToHtml}
						attachResources={attachResources}
					/>
				</div>
			</div>
		</div>

	);
}

const mapStateToProps = (state:any) => {
	return {
		noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		notes: state.notes,
		selectedNoteIds: state.selectedNoteIds,
		// selectedNoteHash: state.selectedNoteHash,
		// noteTags: state.selectedNoteTags,
		// folderId: state.selectedFolderId,
		// itemType: state.selectedItemType,
		// folders: state.folders,
		theme: state.settings.theme,
		// syncStarted: state.syncStarted,
		newNote: state.newNote,
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
