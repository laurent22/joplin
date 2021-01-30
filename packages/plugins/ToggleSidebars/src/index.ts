import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.toolbarButtons.create('toggleSideBarButton', 'toggleSideBar', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.toolbarButtons.create('toggleNoteListButton', 'toggleNoteList', ToolbarButtonLocation.NoteToolbar);
	},
});
