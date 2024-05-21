import Logger from '@joplin/utils/Logger';
import { RefObject, useCallback } from 'react';
import { FormNote, NoteBodyEditorRef } from './types';
import { formNoteToNote } from '.';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import Note from '@joplin/lib/models/Note';
import type { Dispatch } from 'redux';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import type { OnSetFormNote } from './useFormNote';

const logger = Logger.create('useScheduleSaveCallbacks');

interface Props {
	setFormNote: RefObject<OnSetFormNote>;
	dispatch: Dispatch;
	editorRef: RefObject<NoteBodyEditorRef>;
}

const useScheduleSaveCallbacks = (props: Props) => {
	const scheduleSaveNote = useCallback(async (formNote: FormNote) => {
		if (!formNote.saveActionQueue) throw new Error('saveActionQueue is not set!!'); // Sanity check

		// reg.logger().debug('Scheduling...', formNote);

		const makeAction = (formNote: FormNote) => {
			return async function() {
				const note = await formNoteToNote(formNote);
				logger.debug('Saving note...', note);
				const savedNote = await Note.save(note);

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
	}, [props.dispatch, props.setFormNote]);

	const saveNoteIfWillChange = useCallback(async (formNote: FormNote) => {
		if (!formNote.id || !formNote.bodyWillChangeId) return;

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
