import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'search',
	iconName: 'icon-search',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			// Doesn't do anything for now but could be used to
			// automatically focus the search field (using the
			// `focusSearch` command) and then set an initial search.
			// However not straightforward to implement since the SearchBar
			// is not a controlled component.
		},
	};
};
