import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { hasWhiteboardFence } from '@joplin/lib/services/whiteboard/parse';
import { newWhiteboardBody, serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';

export const declaration: CommandDeclaration = {
	name: 'convertNoteToWhiteboard',
	label: () => _('Convert to whiteboard'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId?: string) => {
			const id = noteId || context.state.selectedNoteIds?.[0];
			if (!id) return;

			const note = await Note.load(id);
			if (!note) return;

			if (hasWhiteboardFence(note.body || '')) return;

			const newBody = note.body
				? serializeWhiteboard(note.body, { nodes: [], edges: [] })
				: newWhiteboardBody();

			await Note.save({ id, body: newBody });
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly && whiteboardEnabled',
	};
};
