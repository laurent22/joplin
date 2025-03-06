import Note from '@joplin/lib/models/Note';
import NavService from '@joplin/lib/services/NavService';
import { AttachFileAction } from '../../components/screens/Note/commands/attachFile';

export interface GotoNoteOptions {
	attachFileAction?: AttachFileAction | null;
}

const goToNote = async (id: string, hash?: string, options: GotoNoteOptions = null) => {
	options = {
		attachFileAction: null,
		...options,
	};

	if (!(await Note.load(id))) {
		throw new Error(`No note with id ${id}`);
	}

	return NavService.go('Note', {
		noteId: id,
		noteHash: hash,
		newNoteAttachFileAction: options.attachFileAction,
	});
};

export default goToNote;
