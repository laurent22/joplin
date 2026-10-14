import Note from '../../../../models/Note';
import Folder from '../../../../models/Folder';
import Tag from '../../../../models/Tag';

// Returns null for notes the model must not see: missing, conflicts, or trashed.
const loadNoteForReading = async (id: string) => {
	const note = await Note.load(id);
	if (!note || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) return null;

	const folder = note.parent_id ? await Folder.load(note.parent_id) : null;
	const tags = await Tag.tagsByNoteId(note.id);

	return {
		metadata: {
			id: note.id,
			title: note.title,
			notebook_id: note.parent_id,
			notebook_title: folder ? folder.title : null,
			tags: tags.map(t => t.title),
			is_todo: !!note.is_todo,
			todo_completed: !!note.todo_completed,
			created_time: note.created_time,
			updated_time: note.updated_time,
		},
		body: note.body ?? '',
	};
};

export default loadNoteForReading;
