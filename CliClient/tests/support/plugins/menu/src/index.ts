import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.menus.create('My Menu', [
			{
				commandName: "newNote",
			},
			{
				commandName: "newFolder",
			},
			{
				label: 'My sub-menu',
				submenu: [
					{
						commandName: 'print',
					},
					{
						commandName: 'setTags',
					},
				],
			},
		]);
	},
});
