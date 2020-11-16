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

		// Commands that return a result and take argument can only be used
		// programmatically, so it's not necessary to set a label and icon.
		await joplin.commands.register({
			name: 'commandWithResult',
			execute: async (arg1:string, arg2:number) => {
				return 'I got: ' + arg1 + ' and ' + arg2;
			},
		});

		// Add the first command to the note toolbar
		await joplin.views.toolbarButtons.create('myButton1', 'testCommand1', ToolbarButtonLocation.NoteToolbar);

		// Add the second command to the editor toolbar
		await joplin.views.toolbarButtons.create('myButton2', 'testCommand2', ToolbarButtonLocation.EditorToolbar);

		// Also add the commands to the menu
		await joplin.views.menuItems.create('myMenuItem1', 'testCommand1', MenuItemLocation.Tools, { accelerator: 'CmdOrCtrl+Alt+Shift+B' });
		await joplin.views.menuItems.create('myMenuItem2', 'testCommand2', MenuItemLocation.Tools);

		console.info('Running command with arguments...');
		const result = await joplin.commands.execute('commandWithResult', 'abcd', 123);
		console.info('Result was: ' + result);
	},
});
