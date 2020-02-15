import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import TuiEditor from './TuiEditor';
import { connect } from 'react-redux';

const Note = require('lib/models/Note.js');

interface NoteTextProps {
	style: any,
	noteId: string,
}

interface FormNote {
	id: string,
	title: string,
	body: string,
}

const defaultNote = () => {
	return {
		id: '',
		title: '',
		body: '',
	};
};

class AsyncActionsHandler {

	items_:any = {};
	processing_ = false;
	needProcessing_ = false;
	scheduleProcessingIID_:Timeout = null;

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

		console.info('QUEUE', this.items_);

		this.processing_ = false;
	}

}

const asyncActionHandler = new AsyncActionsHandler();

function NoteText2(props:NoteTextProps) {
	const [formNote, setFormNote] = useState<FormNote>(defaultNote());

	const scheduleSaveNote = (formNote:FormNote) => {
		// const action = (formNote:FormNote) => {
		// 	return async () => {
		// 		await Note.save(formNoteToNote(formNote));
		// 	}
		// }

		const makeAction = (formNote:FormNote) => {
			return async function() {
				console.info('Saving note:', formNote);
				await Note.save(formNoteToNote(formNote));
			};
		};

		asyncActionHandler.push('saveNote', makeAction(formNote));
	};

	const formNoteToNote = (formNote:FormNote):any => {
		return Object.assign({}, formNote);
	};

	useEffect(() => {
		async function fetchNote() {
			console.info('Loading note', props.noteId);

			if (props.noteId) {
				const dbNote = await Note.load(props.noteId);
				const f = {
					id: dbNote.id,
					title: dbNote.title,
					body: dbNote.body,
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
		if (formNote.body === event.value) return;

		const newNote = Object.assign({}, formNote, {
			body: event.value,
		});

		setFormNote(newNote);
		scheduleSaveNote(newNote);
	}, [formNote]);

	return (
		<div style={props.style}>
			<TuiEditor style={{ width: props.style.width, height: props.style.height }} value={formNote.body} onChange={onBodyChange}/>
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
		// theme: state.settings.theme,
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
