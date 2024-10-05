// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.execCommand",
	"manifest_version": 1,
	"app_min_version": "3.1",
	"name": "JS Bundle test",
	"description": "JS Bundle Test plugin",
	"version": "1.0.0",
	"author": "",
	"homepage_url": "https://joplinapp.org"
}
*/

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'testUpdateEditorText',
			label: 'Test setting the editor\'s text with editor.setText',
			iconName: 'fas fa-drum',
			execute: async () => {
				await joplin.commands.execute('editor.setText', 'PASS');
			},
		});
	},
});
