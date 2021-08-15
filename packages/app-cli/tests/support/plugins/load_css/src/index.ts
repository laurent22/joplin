import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const installDir = await joplin.plugins.installationDir();		
		const chromeCssFilePath = installDir + '/chrome.css';
		const noteCssFilePath = installDir + '/note.css';
		await (joplin as any).window.loadChromeCssFile(chromeCssFilePath);
		await (joplin as any).window.loadNoteCssFile(noteCssFilePath);
	},
});
