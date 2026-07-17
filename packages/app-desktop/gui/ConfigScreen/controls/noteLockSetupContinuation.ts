let pendingNoteId: string = null;

export const setNoteLockSetupContinuation = (noteId: string) => {
	pendingNoteId = noteId;
};

export const takeNoteLockSetupContinuation = () => {
	const noteId = pendingNoteId;
	pendingNoteId = null;
	return noteId;
};
