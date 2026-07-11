import { SqlQuery } from '../types';

// remote_body/remote_title no longer reflect what these columns hold once the
// conflict UI lets the user edit the note directly rather than picking
// between two fixed versions, so rename them to resolved_body/resolved_title.
// Migration 53 already shipped in a beta release, so existing rows need to be
// kept rather than dropped.

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE conflict_note_states RENAME COLUMN remote_body TO resolved_body',
		'ALTER TABLE conflict_note_states RENAME COLUMN remote_title TO resolved_title',
	];
};
