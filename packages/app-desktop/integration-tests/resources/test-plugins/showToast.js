// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.showToast",
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
			name: 'testShowToastNotification',
			label: 'testShowToastNotification',
			iconName: 'fas fa-drum',
			execute: async () => {
				await joplin.views.dialogs.showToast({
					message: 'Toast: This is a test info message.',
					duration: 1_000 * 60 * 60, // One hour
				});
			},
		});
	},
});
