import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import TinyMCE, { editorStateToHtml } from './TinyMCE';
import { connect } from 'react-redux';
const { themeStyle, buildStyle } = require('../theme.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const Setting = require('lib/models/Setting');
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToMd = require('lib/HtmlToMd');
const { _ } = require('lib/locale');
const Note = require('lib/models/Note.js');

interface NoteTextProps {
	style: any,
	noteId: string,
	theme: number,
	newNote: any,
}

interface FormNote {
	id: string,
	title: string,
	parent_id: string,
	is_todo: number,
	bodyEditorState: any,
	bodyMarkdown: string,
}

const defaultNote = ():FormNote => {
	return {
		id: '',
		parent_id: '',
		title: '',
		bodyEditorState: null,
		bodyMarkdown: '',
		is_todo: 0,
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

class AsyncActionsHandler {

	items_:any = {};
	processing_ = false;
	needProcessing_ = false;
	scheduleProcessingIID_:any = null;

	push(queueId:string, action:Function) {
		if (!this.items_[queueId]) this.items_[queueId] = [];
		this.items_[queueId].push({ action: action });
		this.scheduleProcessing();
	}

	private scheduleProcessing() {
		if (this.scheduleProcessingIID_) {
			clearTimeout(this.scheduleProcessingIID_);
		}

		this.scheduleProcessingIID_ = setTimeout(() => {
			this.scheduleProcessingIID_ = null;
			this.processQueue();
		}, 1000);
	}

	private async processQueue() {
		if (this.processing_) {
			this.scheduleProcessing();
			return;
		}

		this.processing_ = true;

		for (const queueId in this.items_) {
			const queueItems = this.items_[queueId];

			const itemCount = queueItems.length;
			if (!itemCount) continue;

			const item = queueItems[itemCount - 1];
			await item.action();
			this.items_[queueId].splice(0, itemCount);
		}

		this.processing_ = false;
	}

}

const asyncActionHandler = new AsyncActionsHandler();

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
		const bodyMd = await htmlToMarkdown(await editorStateToHtml(formNote.bodyEditorState));
		const newNote = Object.assign({}, formNote, { body: bodyMd });
		delete newNote.bodyMarkdown;
		delete newNote.bodyEditorState;
		return newNote;
	};

	const scheduleSaveNote = (formNote:FormNote) => {
		const makeAction = (formNote:FormNote) => {
			return async function() {
				const note = await formNoteToNote(formNote);
				console.info('Saving note...', note);
				const result = await Note.save(note);
				if (!formNote.id) {
					setFormNote(Object.assign({}, formNote, { id: result.id }));
				}
			};
		};

		asyncActionHandler.push('saveNote', makeAction(formNote));
	};

	const markdownToHtml = useCallback(async (md:string):Promise<any> => {
		if (!md) return '';

		const theme = themeStyle(props.theme);

		// console.info('===================================');
		// console.info('Markdown', md);

		md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, theme, {
			codeTheme: theme.codeThemeCss,
			// userCss: this.props.customCss ? this.props.customCss : '',
			// resources: await shared.attachedResources(noteBody),
			resources: [],
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
		});

		// console.info('RESULT', result);
		// console.info('===================================');

		return result;
	}, [props.theme]);

	useEffect(() => {
		async function fetchNote() {
			if (props.newNote) {
				setFormNote({
					id: null,
					parent_id: props.newNote.parent_id,
					is_todo: props.newNote.is_todo,
					title: '',
					bodyMarkdown: '',
					bodyEditorState: null,
				});
			} else if (props.noteId) {
				const dbNote = await Note.load(props.noteId);
				const f:FormNote = {
					id: dbNote.id,
					title: dbNote.title,
					is_todo: dbNote.is_todo,
					bodyMarkdown: dbNote.body,
					bodyEditorState: null,
					parent_id: dbNote.parent_id,
				};
				setFormNote(f);
			} else {
				setFormNote(defaultNote());
			}
		}

		fetchNote();
	}, [props.noteId, props.newNote]);


	const onBodyChange = useCallback((event) => {
		if (formNote.bodyEditorState === event.editorState) return;

		const newNote = Object.assign({}, formNote, {
			bodyEditorState: event.editorState,
		});

		setFormNote(newNote);
		scheduleSaveNote(newNote);
	}, [formNote]);

	const onTitleChange = useCallback((event) => {
		const newNote = Object.assign({}, formNote, {
			title: event.target.value,
		});

		setFormNote(newNote);
		scheduleSaveNote(newNote);
	}, [formNote]);

	const onReady = useCallback((event) => {
		setFormNote(Object.assign({}, formNote, {
			bodyEditorState: event.editorState,
		}));
	}, [formNote]);

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
						editorState={formNote.bodyEditorState}
						onChange={onBodyChange}
						onReady={onReady}
						defaultMarkdown={formNote.bodyMarkdown}
						theme={props.theme}
						markdownToHtml={markdownToHtml}
					/>
				</div>
			</div>
		</div>

	);
}

const mapStateToProps = (state:any) => {
	return {
		noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
		// notes: state.notes,
		// selectedNoteIds: state.selectedNoteIds,
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
		// watchedNoteFiles: state.watchedNoteFiles,
		// customCss: state.customCss,
		// lastEditorScrollPercents: state.lastEditorScrollPercents,
		// historyNotes: state.historyNotes,
		// templates: state.templates,
	};
};

export default connect(mapStateToProps)(NoteText2);
