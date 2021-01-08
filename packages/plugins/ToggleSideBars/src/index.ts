import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.toolbarButtons.create('toggleSideBarButton', 'toggleSideBar', 'noteToolbar');
		await joplin.views.toolbarButtons.create('toggleNoteListButton', 'toggleNoteList', 'noteToolbar');
	},
});
