import joplin from 'api';
import { MenuItem } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.menus.create('myMenu', 'My Menu', [
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

		await joplin.workspace.filterEditorContextMenu(async (object: any) => {
			const newItems: MenuItem[] = [];

			newItems.push({
				label: 'filterEditorContextMenu test',
				commandName: 'newNote',
				commandArgs: ['Created from context menu'],
			});

			object.items = object.items.concat(newItems);

			return object;
		});
	},
});
