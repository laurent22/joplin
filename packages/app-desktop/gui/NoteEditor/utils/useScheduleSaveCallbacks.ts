import Logger from '@joplin/utils/Logger';
import { RefObject, useCallback, useRef } from 'react';
import { FormNote, NoteBodyEditorRef } from './types';
import { formNoteToNote } from '.';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import Note from '@joplin/lib/models/Note';
import type { Dispatch } from 'redux';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import type { OnSetFormNote } from './useFormNote';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';

const logger = Logger.create('useScheduleSaveCallbacks');

interface Props {
	setFormNote: RefObject<OnSetFormNote>;
	formNote: RefObject<FormNote>;
	editorId: string;
	dispatch: Dispatch;
	editorRef: RefObject<NoteBodyEditorRef>;
	editorNoteReloadTimeRequest: number;
}

const useScheduleSaveCallbacks = (props: Props) => {
	const editorNoteReloadTimeRequestRef = useRef(props.editorNoteReloadTimeRequest);
	editorNoteReloadTimeRequestRef.current = props.editorNoteReloadTimeRequest;

	const scheduleSaveNote = useCallback((formNote: FormNote) => {
		if (!formNote.saveActionQueue) throw new Error('saveActionQueue is not set!!'); // Sanity check

		// reg.logger().debug('Scheduling...', formNote);

		const editorNoteReloadTimeRequest = editorNoteReloadTimeRequestRef.current;
		const makeAction = (formNote: FormNote) => {
			return async function() {
				if (editorNoteReloadTimeRequestRef.current > editorNoteReloadTimeRequest) return;

				// The lock state may change between scheduling and execution (e.g. encryption enabled
				// from the note list menu), so the save uses the latest form state for this note.
				const latestFormNote = props.formNote.current?.id === formNote.id ? props.formNote.current : formNote;
				let note;
				if (isNoteLockEnabled()) {
					note = await formNoteToNote({ ...formNote, is_locked: latestFormNote.is_locked, isDecrypted: latestFormNote.isDecrypted });
				} else {
					note = await formNoteToNote(formNote);
				}
				logger.debug('Saving note...', isNoteLockEnabled() && note.is_locked ? note.id : note);
				const savedNote = await Note.save(note, { changeId: `editorChange-${props.editorId}`, useNoteLock: true, noteLockKey: latestFormNote.noteLockKey });

				props.setFormNote.current((prev: FormNote) => {
					return { ...prev, user_updated_time: savedNote.user_updated_time, hasChanged: false };
				});

				void ExternalEditWatcher.instance().updateNoteFile(savedNote);

				props.dispatch({
					type: 'EDITOR_NOTE_STATUS_REMOVE',
					id: formNote.id,
				});

				eventManager.emit(EventName.NoteContentChange, { note: savedNote });
			};
		};

		formNote.saveActionQueue.push(makeAction(formNote));
		return formNote.saveActionQueue.waitForAllDone();
	}, [props.dispatch, props.editorId, props.setFormNote, props.formNote]);

	const saveNoteIfWillChange = useCallback(async (formNote: FormNote) => {
		if (!formNote.id || !formNote.bodyWillChangeId || !props.editorRef.current) return;

		const body = await props.editorRef.current.content();

		void scheduleSaveNote({
			...formNote,
			body: body,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
		});
	}, [scheduleSaveNote, props.editorRef]);

	return { saveNoteIfWillChange, scheduleSaveNote };
};

export default useScheduleSaveCallbacks;
