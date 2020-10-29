import { CommandRuntime, CommandDeclaration, CommandContext } from 'lib/services/CommandService';
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');

export const declaration:CommandDeclaration = {
	name: 'openNote',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (context:CommandContext, noteId:string, hash:string = null) => {
			const note = await Note.load(noteId);
			if (!note) throw new Error(`No such note: ${noteId}`);

			const folder = await Folder.load(note.parent_id);
			if (!folder) throw new Error(`Note parent notebook does not exist: ${JSON.stringify(note)}`);

			context.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: folder.id,
				noteId: note.id,
				hash,
			});
		},
	};
};
