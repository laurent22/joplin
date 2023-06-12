import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const joplinData = (joplin.data as any);
		
		await joplinData.userDataSet('mykey', 'abcd');

		console.info('Got back user data:', await joplinData.userDataGet('mykey'));

		await joplinData.userDataDelete('mykey');
	
		console.info('Got back user data:', await joplinData.userDataGet('mykey'));
	},
});
