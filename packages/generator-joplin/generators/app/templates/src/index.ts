import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		console.info('Test plugin started!');
	},
});
