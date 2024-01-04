import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		joplin.views.dialogs.showMessageBox('Test dialog!');
	},
});
