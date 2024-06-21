import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';

export const declaration: CommandDeclaration = {
	name: 'showLocalSearch',
	label: () => _('Search in current note'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			if (comp.editorRef.current && await comp.editorRef.current.supportsCommand('search')) {
				comp.editorRef.current.execCommand({ name: 'search' });
			} else {
				if (comp.noteSearchBarRef.current) {
					focus('showLocalSearch', comp.noteSearchBarRef.current);
				} else {
					comp.setShowLocalSearch(true);
				}
			}
		},
		enabledCondition: 'oneNoteSelected',
	};
};
