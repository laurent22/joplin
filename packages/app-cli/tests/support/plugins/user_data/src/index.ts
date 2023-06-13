import joplin from 'api';
import { ModelType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		const joplinData = (joplin.data as any);

		const folder = await joplin.data.post(['folders'], null, { title: "test" });
		const note = await joplin.data.post(['notes'], null, { title: "test", parent_id: folder.id });
		
		await joplinData.userDataSet(ModelType.Note, note.id, 'mykey', 'abcd');

		console.info('Got back user data:', await joplinData.userDataGet(ModelType.Note, note.id, 'mykey'));

		await joplinData.userDataDelete(ModelType.Note, note.id, 'mykey');
	
		console.info('Got back user data:', await joplinData.userDataGet(ModelType.Note, note.id, 'mykey'));
	},
});
