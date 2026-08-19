import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { newWhiteboardBody } from '@joplin/lib/services/whiteboard/serialize';
import { createNoteInActiveFolder, newNoteEnabledConditions } from './newNote';

export const declaration: CommandDeclaration = {
	name: 'newWhiteboard',
	label: () => _('Create whiteboard'),
	iconName: 'fa-th',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, title?: string) => {
			await createNoteInActiveFolder({
				title: title || _('Untitled whiteboard'),
				body: newWhiteboardBody(),
				// A whiteboard isn't a place-stamped capture; skip the
				// reverse-geocode lookup that fires for ordinary new notes.
				updateGeolocation: false,
			});
		},
		enabledCondition: newNoteEnabledConditions,
	};
};
