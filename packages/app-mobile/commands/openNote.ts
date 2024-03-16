import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import goToNote from './util/goToNote';

const logger = Logger.create('openNoteCommand');

export const declaration: CommandDeclaration = {
	name: 'openNote',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, noteId: string, hash: string = null) => {
			logger.info(`Navigating to note ${noteId}`);
			await goToNote(noteId, hash);
		},
	};
};
