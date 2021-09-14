import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const Note = require('lib/models/Note');
const BaseModel = require('lib/BaseModel');
// const { _ } = require('lib/locale');
const { uuid } = require('lib/uuid.js');

export const declaration:CommandDeclaration = {
	name: 'search',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ query }:any) => {
			console.info('RUNTIME', query);

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
				const note = await Note.load(comp.props.selectedNoteId);
				if (note) {
					comp.props.dispatch({
						type: 'FOLDER_AND_NOTE_SELECT',
						folderId: note.parent_id,
						noteId: note.id,
					});
				}
			}
		},
	};
};
