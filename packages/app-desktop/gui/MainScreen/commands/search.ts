import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
const BaseModel = require('@joplin/lib/BaseModel').default;
const uuid = require('@joplin/lib/uuid').default;

export const declaration:CommandDeclaration = {
	name: 'search',
	iconName: 'icon-search',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async (_context:CommandContext, query:string) => {
			if (!comp.searchId_) comp.searchId_ = uuid.create();

			comp.props.dispatch({
				type: 'SEARCH_UPDATE',
				search: {
					id: comp.searchId_,
					title: query,
					query_pattern: query,
					query_folder_id: null,
					type_: BaseModel.TYPE_SEARCH,
				},
			});

			if (query) {
				comp.props.dispatch({
					type: 'SEARCH_SELECT',
					id: comp.searchId_,
				});
			} else {
				// Note: Normally there's no need to do anything when the search query
				// is cleared as the reducer should handle all state changes.
				// https://github.com/laurent22/joplin/issues/3748

				// const note = await Note.load(comp.props.selectedNoteId);
				// if (note) {
				// 	comp.props.dispatch({
				// 		type: 'FOLDER_AND_NOTE_SELECT',
				// 		folderId: note.parent_id,
				// 		noteId: note.id,
				// 	});
				// }
			}
		},
	};
};
