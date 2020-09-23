joplin.plugins.register({
	onStart: async function() {
		// We'll add this command to the note toolbar
		joplin.commands.register({
			name: 'testCommand1',
			label: () => 'My Test Command 1',
			iconName: 'fas fa-music',
		}, {
			execute: () => {
				alert('Testing plugin command 1');
			},
		});

		// And this command to the editor toolbar
		joplin.commands.register({
			name: 'testCommand2',
			label: () => 'My Test Command 2',
			iconName: 'fas fa-drum',
		}, {
			execute: () => {
				alert('Testing plugin command 2');
			},
		});

		joplin.views.createToolbarButton('testCommand1', 'noteToolbar');
		joplin.views.createToolbarButton('testCommand2', 'editorToolbar');
		// joplin.views.createMenuItem('myTestCommand', 'tools');
	},
});
