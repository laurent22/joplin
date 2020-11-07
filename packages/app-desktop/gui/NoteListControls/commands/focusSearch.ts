import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration:CommandDeclaration = {
	name: 'focusSearch',
	label: () => _('Search in all the notes'),
};

export const runtime = (searchBarRef:any):CommandRuntime => {
	return {
		execute: async () => {
			if (searchBarRef.current) searchBarRef.current.focus();
		},
	};
};
