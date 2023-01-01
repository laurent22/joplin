import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showLocalSearch',
	label: () => _('Search in current note'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			if (comp.editorRef.current && comp.editorRef.current.supportsCommand('search')) {
				comp.editorRef.current.execCommand({ name: 'search' });
			} else {
				if (comp.noteSearchBarRef.current) {
					comp.noteSearchBarRef.current.focus();
				} else {
					comp.setShowLocalSearch(true);
				}
			}
		},
		enabledCondition: 'oneNoteSelected',
	};
};
