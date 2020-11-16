import joplin from 'api';
import { MenuItemLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'sayHi',
			label: 'Say Hi',
			execute: async () => {
				await joplin.commands.execute('replaceSelection', 'hi!');
			},
		});

		await joplin.views.menuItems.create('myContextMenuItem', 'sayHi', MenuItemLocation.EditorContextMenu);
	},
});
