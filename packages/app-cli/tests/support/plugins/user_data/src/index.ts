import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const joplinData = (joplin.data as any);

		const folder = await joplin.data.post(['folders'], null, { title: "test" });
		const note = await joplin.data.post(['notes'], null, { title: "test", parent_id: folder.id });

		console.info('Folder', folder);
		console.info('Note', note);
		
		await joplinData.userDataSet(note.id, 'mykey', 'abcd');

		console.info('Got back user data:', await joplinData.userDataGet(note.id, 'mykey'));

		await joplinData.userDataDelete(note.id, 'mykey');
	
		console.info('Got back user data:', await joplinData.userDataGet(note.id, 'mykey'));
	},
});
