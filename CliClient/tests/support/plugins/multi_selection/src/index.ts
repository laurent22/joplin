import joplin from 'api';
import { MenuItemLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'concatSelectedNotes',
			label: 'Concatenate selected notes into one',
			iconName: 'fas fa-music',
			execute: async () => {
				const noteIds = await joplin.workspace.selectedNoteIds();
				const newNoteBody = [];
				let parentId = null;

				for (const noteId of noteIds) {
					const note = await joplin.data.get(['notes', noteId], { fields: ['title', 'body', 'parent_id']});
					newNoteBody.push([
						'# ' + note.title,
						'',
						note.body,
					].join('\n'));

					if (!parentId) parentId = note.parent_id;
				}

				const newNote = {
					title: 'Concatenated note',
					body: newNoteBody.join('\n\n'),
					parent_id: parentId,
				};

				await joplin.data.post(['notes'], null, newNote);
			},
		});

		joplin.views.menuItems.create('concatSelectedNotes', MenuItemLocation.Context);
	},
});
