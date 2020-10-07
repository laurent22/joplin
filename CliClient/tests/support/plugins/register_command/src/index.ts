import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'testCommand1',
			label: 'My Test Command 1',
			iconName: 'fas fa-music',
			execute: async () => {
				alert('Testing plugin command 1');
			},
		});

		await joplin.commands.register({
			name: 'testCommand2',
			label: 'My Test Command 2',
			iconName: 'fas fa-drum',
			execute: async () => {
				alert('Testing plugin command 2');
			},
		});

		// Add the first command to the note toolbar
		await joplin.views.toolbarButtons.create('testCommand1', ToolbarButtonLocation.NoteToolbar);

		// Add the second command to the editor toolbar
		await joplin.views.toolbarButtons.create('testCommand2', ToolbarButtonLocation.EditorToolbar);

		// Also add the commands to the menu
		await joplin.views.menuItems.create('testCommand1', MenuItemLocation.Tools, { accelerator: 'CmdOrCtrl+Alt+Shift+B' });
		await joplin.views.menuItems.create('testCommand2', MenuItemLocation.Tools);
	},
});
