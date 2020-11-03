import joplin from 'api';
const leftPad = require('left-pad');

joplin.plugins.register({
	onStart: async function() {
		await joplin.data.post(['folders'], null, { title: leftPad('foo', 5) });
	},
});
