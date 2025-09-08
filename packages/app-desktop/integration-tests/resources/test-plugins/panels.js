// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.panels",
	"manifest_version": 1,
	"app_min_version": "3.1",
	"name": "JS Bundle test",
	"description": "JS Bundle Test plugin",
	"version": "1.0.0",
	"author": "",
	"homepage_url": "https://joplinapp.org"
}
*/

const waitFor = async (condition) => {
	const wait = () => {
		return new Promise(resolve => {
			setTimeout(() => resolve(), 100);
		});
	};
	for (let i = 0; i < 100; i++) {
		if (await condition()) {
			return;
		}

		// Pause for a brief delay
		await wait();
	}

	throw new Error('Condition was never true');
};

joplin.plugins.register({
	onStart: async function() {
		const panels = joplin.views.panels;
		const view = await panels.create('panelTestView');
		await panels.setHtml(view, '<h1>Panel content</h1><p>Test</p>');
		await panels.hide(view);


		await joplin.commands.register({
			name: 'testShowPanel',
			label: 'Test panel visibility',
			execute: async () => {
				await panels.show(view);
				await waitFor(async () => {
					return await panels.visible(view);
				});
				await joplin.commands.execute('editor.setText', 'visible');
			},
		});

		await joplin.commands.register({
			name: 'testHidePanel',
			label: 'Test: Hide the panel',
			execute: async () => {
				await panels.hide(view);
				await waitFor(async () => {
					return !await panels.visible(view);
				});

				await joplin.commands.execute('editor.setText', 'hidden');
			},
		});
	},
});
