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


		joplin.commands.register(
			{
				name: 'selectedTextInAlert',
				label: () => 'Displays the currently selected text in an alert box',
				iconName: 'fas fa-music',
			},
			{
				execute: async () => {
					const selectedText = await joplin.workspace.execEditorCommand({ name: 'selectedText' });
					const selectedHtml = await joplin.workspace.execEditorCommand({ name: 'selectedHtml' });
					alert('Selected text: ' + selectedText + '\n\nSelected HTML: ' + selectedHtml);
				},
			}
		);

		joplin.commands.register(
			{
				name: 'replaceSelection',
				label: () => 'Replace the selection by a string',
				iconName: 'fas fa-drum',
			},
			{
				execute: async () => {
					await joplin.workspace.execEditorCommand({ name: 'replaceSelection', value: 'mystring' });
				},
			}
		);
		
		joplin.views.createToolbarButton('selectedTextInAlert', 'editorToolbar');
		joplin.views.createToolbarButton('replaceSelection', 'editorToolbar');
	},
});
