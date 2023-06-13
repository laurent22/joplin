import joplin from 'api';
import { ModelType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		const folder = await joplin.data.post(['folders'], null, { title: "test" });
		const note = await joplin.data.post(['notes'], null, { title: "test", parent_id: folder.id });
		
		await joplin.data.userDataSet(ModelType.Note, note.id, 'mykey', 'abcd');

		console.info('Got back user data:', await joplin.data.userDataGet(ModelType.Note, note.id, 'mykey'));

		await joplin.data.userDataDelete(ModelType.Note, note.id, 'mykey');
	
		console.info('Got back user data:', await joplin.data.userDataGet(ModelType.Note, note.id, 'mykey'));
	},
});
