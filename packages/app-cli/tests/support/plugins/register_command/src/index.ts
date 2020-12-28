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

		await joplin.commands.register({
			name: 'contextMenuCommandExample',
			label: 'My Context Menu command',
			execute: async (noteIds:string[]) => {
				const notes = [];
				for (const noteId of noteIds) {
					notes.push(await joplin.data.get(['notes', noteId]));
				}

				const noteTitles = notes.map((note:any) => note.title);
				alert('The following notes will be processed:\n\n' + noteTitles.join(', '));
			},
		});

		await joplin.commands.register({
			name: 'folderContextMenuExample',
			label: 'Folder menu item from plugin',
			execute: async (folderId:string) => {
				console.info('Click on folder: ' + folderId);
			},
		});

		await joplin.commands.register({
			name: 'tagContextMenuExample',
			label: 'Tag menu item from plugin',
			execute: async (tagId:string) => {
				console.info('Click on tag: ' + tagId);
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

		await joplin.views.menuItems.create('contextMenuItem1', 'contextMenuCommandExample', MenuItemLocation.NoteListContextMenu);

		await joplin.views.menuItems.create('folderMenuItem1', 'folderContextMenuExample', MenuItemLocation.FolderContextMenu);
		await joplin.views.menuItems.create('tagMenuItem1', 'tagContextMenuExample', MenuItemLocation.TagContextMenu);

		console.info('Running command with arguments...');
		const result = await joplin.commands.execute('commandWithResult', 'abcd', 123);
		console.info('Result was: ' + result);
	},
});
