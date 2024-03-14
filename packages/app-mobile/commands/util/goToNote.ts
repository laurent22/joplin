import Note from '@joplin/lib/models/Note';
import NavService from '@joplin/lib/services/NavService';

const goToNote = async (id: string, hash?: string) => {
	if (!(await Note.load(id))) {
		throw new Error(`No note with id ${id}`);
	}

	return NavService.go('Note', {
		noteId: id,
		noteHash: hash,
	});
};

export default goToNote;
