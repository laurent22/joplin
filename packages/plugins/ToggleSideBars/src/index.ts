import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.toolbarButtons.create('tsb', 'toggleSideBar', 'noteToolbar');
		await joplin.views.toolbarButtons.create('tnl', 'toggleNoteList', 'noteToolbar');
	},
});
