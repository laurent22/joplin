import defaultAction from '../utils/defaultAction';
import { ModelType } from '../../../BaseModel';
import { Request, RequestMethod } from '../Api';
import { ErrorForbidden } from '../utils/errors';
import isNoteLockEnabled from '../../noteLock/isNoteLockEnabled';
import NoteLockNote from '../../noteLock/NoteLockNote';
import Note from '../../../models/Note';
import Revision from '../../../models/Revision';

export default async function(request: Request, id: string = null, link: string = null) {
	// A revision is a JSON diff rather than a note body, so it cannot be served through a gated
	// load. Loads and saves are refused outright; deletion is left open, as it is for the note itself.
	if (isNoteLockEnabled() && request.method !== RequestMethod.DELETE) {
		const noteIds: string[] = [];
		if (id) {
			const revision = await Revision.load(id, { fields: ['item_id'] });
			if (revision) noteIds.push(revision.item_id);
		}
		// A save also names its note, which is how a revision would be moved onto a locked one.
		if (request.body && request.method !== RequestMethod.GET) {
			const requestedNoteId = request.bodyJson()?.item_id;
			if (requestedNoteId) noteIds.push(requestedNoteId);
		}

		for (const noteId of noteIds) {
			const note = await Note.load(noteId, { fields: ['is_locked'] });
			if (NoteLockNote.isLocked(note)) throw new ErrorForbidden('The revisions of a locked note cannot be accessed through the API');
		}
	}
	return defaultAction(ModelType.Revision, request, id, link, ['id']);
}
