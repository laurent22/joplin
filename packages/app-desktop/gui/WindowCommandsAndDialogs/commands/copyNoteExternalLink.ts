import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import { getNoteCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import { clipboard } from 'electron';

export const declaration: CommandDeclaration = {
	name: 'copyNoteExternalLink',
	label: () => _('Copy external link'),
	iconName: 'fas fa-link',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			if (!noteId) return;
			clipboard.writeText(getNoteCallbackUrl(noteId));
		},
		enabledCondition: 'oneNoteSelected',
	};
};
