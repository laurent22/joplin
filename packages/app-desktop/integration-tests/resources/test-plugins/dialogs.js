// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.dialogs",
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
		const dialogs = joplin.views.dialogs;
		const dialogHandle = await dialogs.create('test-dialog');
		await dialogs.setHtml(
			dialogHandle,
			`
				<form name="main-form">
					<label>Test: <input type="checkbox" name="test" checked/></label>
				</form>
			`,
		);
		await dialogs.setButtons(dialogHandle, [
			{
				id: 'ok',
				title: 'Okay',
			},
		]);
		await joplin.commands.register({
			name: 'showTestDialog',
			label: 'showTestDialog',
			iconName: 'fas fa-drum',
			execute: async () => {
				const result = await joplin.views.dialogs.open(dialogHandle);
				await joplin.commands.execute('editor.setText', JSON.stringify({
					id: result.id,
					hasFormData: !!result.formData,
				}));
			},
		});
	},
});
