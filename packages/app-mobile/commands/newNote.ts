import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import goToNote, { GotoNoteOptions } from './util/goToNote';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import Folder from '@joplin/lib/models/Folder';

const logger = Logger.create('newNoteCommand');

export const declaration: CommandDeclaration = {
	name: 'newNote',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body = '', todo = false, options: GotoNoteOptions = null) => {
			let folderId = Setting.value('activeFolderId');
			if (!folderId) {
				logger.warn('Not creating new note -- no active folder ID.');
				return;
			}

			const folder = await Folder.load(folderId);
			if (!folder || !!folder.deleted_time) {
				const defaultFolder = await Folder.defaultFolder();
				if (!defaultFolder) return;
				folderId = defaultFolder.id;
			}

			const note = await Note.save({
				body,
				parent_id: folderId,
				is_todo: todo ? 1 : 0,
			}, { provisional: true });

			logger.info(`Navigating to note ${note.id}`);
			await goToNote(note.id, '', options);
		},
	};
};
