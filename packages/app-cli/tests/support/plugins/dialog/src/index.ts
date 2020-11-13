import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const dialogs = joplin.views.dialogs;

		const handle = await dialogs.create('myDialog1');
		await dialogs.setHtml(handle, '<p>Testing dialog with default buttons</p><p>Second line</p><p>Third line</p>');
		const result = await dialogs.open(handle);
		alert('This button was clicked: ' + result);

		const handle2 = await dialogs.create('myDialog2');
		await dialogs.setHtml(handle2, '<p>Testing dialog with custom buttons</p><p>Second line</p><p>Third line</p>');
		await dialogs.setButtons(handle2, [
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
		]);

		const result2 = await dialogs.open(handle2);
		alert('This button was clicked: ' + result2);

	},
});
