import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';
import { WindowCommandDependencies } from '../utils/types';

export const declaration: CommandDeclaration = {
	name: 'showLocalSearch',
	label: () => _('Search in current note'),
};

export const runtime = (comp: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async () => {
			if (comp.editorRef.current && await comp.editorRef.current.supportsCommand('search')) {
				void comp.editorRef.current.execCommand({ name: 'search' });
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
