const leftPad = require('left-pad');

joplin.plugins.register({
	onStart: async function() {
		await joplin.api.post('folders', null, { title: leftPad('foo', 5) });
	},
});