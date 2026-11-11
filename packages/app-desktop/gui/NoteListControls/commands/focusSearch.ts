import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'focusSearch',
	label: () => _('Search in all the notes'),
};

export const runtime = (searchBarRef: { current: { select: ()=> void } | null }): CommandRuntime => {
	return {
		execute: async () => {
			if (searchBarRef.current) searchBarRef.current.select();
		},
	};
};
