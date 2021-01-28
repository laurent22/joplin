import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		setTimeout(async () => {
			const installDir = await joplin.plugins.installationDir();
			console.info('Plugin installation directory: ', installDir);
			
			const fs = joplin.require('fs-extra');
			const fileContent = await fs.readFile(installDir + '/external.txt', 'utf8');
			console.info('Read external file content: ' + fileContent);
		}, 5000);
	},
});
