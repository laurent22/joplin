import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';

const highlightLineSettingId = 'highlight-active-line';

const registerSettings = async () => {
	const sectionName = 'example-cm6-plugin';
	await joplin.settings.registerSection(sectionName, {
		label: 'CodeMirror 6 demo plugin',
		description: 'Settings for the CodeMirror 6 example plugin.',
		iconName: 'fas fa-edit',
	});

	await joplin.settings.registerSettings({
		[highlightLineSettingId]: {
			section: sectionName,
			value: true, // Default value
			public: true, // Show in the settings screen
			type: SettingItemType.Bool,
			label: 'Highlight active line',
		},
	});
};

const registerMessageListener = async (contentScriptId: string) => {
	await joplin.contentScripts.onMessage(
		contentScriptId,
		
		// Sending messages with `context.postMessage` from the content script with
		// the given `contentScriptId` calls this onMessage listener:
		async (message: any) => {
			if (message === 'getSettings') {
				const settingValue = await joplin.settings.value(highlightLineSettingId);
				return {
					highlightActiveLine: settingValue,
				};
			}
		},
	);
};

const registerCodeMirrorContentScript = async (contentScriptName: string) => {
	const id = contentScriptName;
	await registerMessageListener(id);
	await joplin.contentScripts.register(
		ContentScriptType.CodeMirrorPlugin,
		id,
		`./contentScripts/${id}.js`,
	);
};

joplin.plugins.register({
	onStart: async function() {
		await registerSettings();

		await registerCodeMirrorContentScript('codeMirror6');
		await registerCodeMirrorContentScript('codeMirror5');
	},
});
