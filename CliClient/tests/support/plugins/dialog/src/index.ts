joplin.plugins.register({
	onStart: async function() {
		const dialog = joplin.views.createWebviewDialog();
		dialog.html = '<p>Testing dialog with default buttons</p><p>Second line</p><p>Third line</p>';
		const result = await dialog.open();
		alert('This button was clicked: ' + result);

		const dialog2 = joplin.views.createWebviewDialog();
		dialog2.html = '<p>Testing dialog with custom buttons</p><p>Second line</p><p>Third line</p>';
		dialog.buttons = [
			{
				id: 'ok',
			},
			{
				id: 'cancel',
			},
			{
				id: 'moreInfo',
				title: 'More info',
			},
		];

		const result2 = await dialog.open();
		alert('This button was clicked: ' + result2);

	},
});
