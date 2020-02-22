import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
// import TuiEditor from './TuiEditor';
// import DraftJs, { markdownToValue, valueToMarkdown } from './DraftJs';
import TinyMCE from './TinyMCE';
import { connect } from 'react-redux';
const { themeStyle } = require('../theme.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const Setting = require('lib/models/Setting');
const { MarkupToHtml } = require('lib/joplin-renderer');


const Note = require('lib/models/Note.js');

interface NoteTextProps {
	style: any,
	noteId: string,
	theme: number,
}

interface FormNote {
	id: string,
	title: string,
	bodyEditorState: any,
	bodyMarkdown: string,
}

const defaultNote = ():FormNote => {
	return {
		id: '',
		title: '',
		bodyEditorState: null,
		bodyMarkdown: '',
	};
};

// class AsyncActionsHandler {

// 	items_:any = {};
// 	processing_ = false;
// 	needProcessing_ = false;
// 	scheduleProcessingIID_:any = null;

// 	push(queueId:string, action:Function) {
// 		if (!this.items_[queueId]) this.items_[queueId] = [];
// 		this.items_[queueId].push({ action: action });
// 		this.scheduleProcessing();
// 	}

// 	private scheduleProcessing() {
// 		if (this.scheduleProcessingIID_) {
// 			clearTimeout(this.scheduleProcessingIID_);
// 		}

// 		this.scheduleProcessingIID_ = setTimeout(() => {
// 			this.scheduleProcessingIID_ = null;
// 			this.processQueue();
// 		}, 1000);
// 	}

// 	private async processQueue() {
// 		if (this.processing_) {
// 			this.scheduleProcessing();
// 			return;
// 		}

// 		this.processing_ = true;

// 		for (const queueId in this.items_) {
// 			const queueItems = this.items_[queueId];

// 			const itemCount = queueItems.length;
// 			if (!itemCount) continue;

// 			const item = queueItems[itemCount - 1];
// 			await item.action();
// 			this.items_[queueId].splice(0, itemCount);
// 		}

// 		console.info('QUEUE', this.items_);

// 		this.processing_ = false;
// 	}

// }

// const asyncActionHandler = new AsyncActionsHandler();

// TODO: HtmlToMd should support joplin-source element

function NoteText2(props:NoteTextProps) {
	const [formNote, setFormNote] = useState<FormNote>(defaultNote());

	const scheduleSaveNote = (formNote:FormNote) => {
		console.info('Schedule', formNote);
		// const makeAction = (formNote:FormNote) => {
		// 	return async function() {
		// 		const note = await formNoteToNote(formNote);
		// 		console.info('Saving note:', note);
		// 		// await Note.save(note);
		// 	};
		// };

		// asyncActionHandler.push('saveNote', makeAction(formNote));
	};

	// const formNoteToNote = async (formNote:FormNote):any => {
	// 	// const md = await valueToMarkdown(formNote.body);
	// 	// return Object.assign({}, formNote, { body: md });
	// 	return Object.assign({}, formNote);
	// };

	const markdownToHtml = useCallback(async (md:string):Promise<any> => {
		if (!md) return '';

		const theme = themeStyle(props.theme);

		console.info('===================================');

		console.info('Markdown', md);

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

		console.info('RESULT', result);

		console.info('===================================');

		return result;
	}, [props.theme]);

	useEffect(() => {
		async function fetchNote() {
			console.info('Loading note', props.noteId);

			if (props.noteId) {
				const dbNote = await Note.load(props.noteId);
				const f:FormNote = {
					id: dbNote.id,
					title: dbNote.title,
					bodyMarkdown: dbNote.body,
					bodyEditorState: null,
				};
				console.info('Loaded note', f);
				setFormNote(f);
			} else {
				setFormNote(defaultNote());
				console.info('Cleared note');
			}
		}

		fetchNote();
	}, [props.noteId]);


	const onBodyChange = useCallback((event) => {
		if (formNote.bodyEditorState === event.editorState) return;

		const newNote = Object.assign({}, formNote, {
			bodyEditorState: event.editorState,
		});

		setFormNote(newNote);
		scheduleSaveNote(newNote);
	}, [formNote]);

	return (
		<div style={props.style}>
			<TinyMCE
				style={{ width: props.style.width, height: props.style.height }}
				editorState={formNote.bodyEditorState}
				onChange={onBodyChange}
				defaultMarkdown={formNote.bodyMarkdown}
				theme={props.theme}
				markdownToHtml={markdownToHtml}
			/>
		</div>
	);

	// return (
	// 	<div style={props.style}>
	// 		<DraftJs style={{ width: props.style.width, height: props.style.height }} value={formNote.body} onChange={onBodyChange}/>
	// 	</div>
	// );

	// return (
	// 	<div style={props.style}>
	// 		<TuiEditor style={{ width: props.style.width, height: props.style.height }} value={formNote.body} onChange={onBodyChange}/>
	// 	</div>
	// );
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
		// newNote: state.newNote,
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
