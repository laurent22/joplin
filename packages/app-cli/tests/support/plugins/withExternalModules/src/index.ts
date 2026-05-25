
import leftPad from 'left-pad';
import joplin from 'api';
joplin.plugins.register({
	onStart: async function() {
		await joplin.data.post(['folders'], null, { title: leftPad('foo', 5) });
	},
});
