joplin.plugins.register({
	onStart: async function() {
		joplin.commands.register({
			name: 'testCommand1',
			label: () => 'My Test Command 1',
			iconName: 'fas fa-music',
		}, {
			execute: () => {
				alert('Testing plugin command 1');
			},
		});

		joplin.commands.register({
			name: 'testCommand2',
			label: () => 'My Test Command 2',
			iconName: 'fas fa-drum',
		}, {
			execute: () => {
				alert('Testing plugin command 2');
			},
		});

		// Add the first command to the note toolbar
		joplin.views.createToolbarButton('testCommand1', 'noteToolbar');

		// Add the second command to the editor toolbar
		joplin.views.createToolbarButton('testCommand2', 'editorToolbar');

		// Also add the commands to the menu
		joplin.views.createMenuItem('testCommand1', 'tools', { accelerator: 'CmdOrCtrl+Alt+Shift+B' });
		joplin.views.createMenuItem('testCommand2', 'tools');
	},
});
