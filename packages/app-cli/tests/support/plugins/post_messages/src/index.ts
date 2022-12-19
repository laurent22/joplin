import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';

async function setupContentScriptMarkdownIt() {
	const contentScriptId = 'contentScriptMarkdownIt';

	await joplin.contentScripts.register(
		ContentScriptType.MarkdownItPlugin,
		contentScriptId,
		'./contentScriptMarkdownIt.js'
	);

	await joplin.contentScripts.onMessage(contentScriptId, (message:any) => {
		console.info('PostMessagePlugin (MD ContentScript): Got message:', message);
		const response = message + '+responseFromMdContentScriptHandler';
		console.info('PostMessagePlugin (MD ContentScript): Responding with:', response);
		return response;
	});
}

async function setContentScriptCodeMirror() {
	const contentScriptId = 'contentScriptCodeMirror';

	await joplin.contentScripts.register(
		ContentScriptType.CodeMirrorPlugin,
		contentScriptId,
		'./contentScriptCodeMirror.js'
	);

	await joplin.contentScripts.onMessage(contentScriptId, (message:any) => {
		console.info('PostMessagePlugin (CodeMirror ContentScript): Got message:', message);
		const response = message + '+responseFromCodeMirrorScriptHandler';
		console.info('PostMessagePlugin (CodeMirror ContentScript): Responding with:', response);
		return response;
	});
}

async function setupWebviewPanel() {
	const panels = joplin.views.panels;

	const view = await panels.create('postMessageTestView');

	await panels.setHtml(view, '<p style="border: 1px solid blue; padding: 10px;">This is a custom webview. <a class="webview-test-link" href="#">Click to test postMessage</a></p>');
	await panels.addScript(view, './webview.js');
	await panels.addScript(view, './webview.css');

	panels.onMessage(view, (message:any) => {
		console.info('PostMessagePlugin (Webview): Got message from webview:', message);
		const response = message + '+responseFromWebviewPanel';
		console.info('PostMessagePlugin (Webview): Responding with:', response);
		return response;
	});

	panels.show(view, true);

	var intervalID = setInterval(
		() => {
			console.info('check if webview is ready...');
			if(panels.visible(view)) {
				console.info('plugin: sending message to webview. ');
				panels.postMessage(view, 'testingPluginMessage');
			}
			clearInterval(intervalID);
		}
			, 500
	);
}

joplin.plugins.register({
	onStart: async function() {
		await setupContentScriptMarkdownIt();
		await setContentScriptCodeMirror();
		await setupWebviewPanel();
	},
});
