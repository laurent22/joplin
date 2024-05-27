import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';


export const declaration: CommandDeclaration = {
	name: 'openNote',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string, hash: string = null) => {
			const note = await Note.load(noteId);
			if (!note) throw new Error(`No such note: ${noteId}`);

			const folder = await Folder.load(note.parent_id);
			if (!folder) throw new Error(`Note parent notebook does not exist: ${JSON.stringify(note)}`);

			Setting.openDefaultEditor();

			context.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: folder.id,
				noteId: note.id,
				hash,
			});
		},
	};
};
