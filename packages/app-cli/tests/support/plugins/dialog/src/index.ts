import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const dialogs = joplin.views.dialogs;

		const handle = await dialogs.create();
		await dialogs.setHtml(handle, '<p>Testing dialog with default buttons</p><p>Second line</p><p>Third line</p>');
		const result = await dialogs.open(handle);
		alert('Got result: ' + JSON.stringify(result));

		const handle2 = await dialogs.create();
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
		alert('Got result: ' + JSON.stringify(result2));

		const handle3 = await dialogs.create();
		await dialogs.setHtml(handle3, `
		<p>Testing dialog with form elements</p>
		<form name="user">
			Name: <input type="text" name="name"/>
			<br/>
			Email: <input type="text" name="email"/>
		</form>
		`);

		const result3 = await dialogs.open(handle3);
		alert('Got result: ' + JSON.stringify(result3));		
	},

});
