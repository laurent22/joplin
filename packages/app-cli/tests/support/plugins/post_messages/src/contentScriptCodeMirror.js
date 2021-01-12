module.exports = {
	default: function(context) { 
		return {
			plugin: function(CodeMirror) {
				CodeMirror.defineOption('inlineTags', [], function(cm, value, prev) {
					cm.on('inputRead', async function (cm1, change) {
						if (change.text[0] === 'x') {
							console.info('contentScriptCodeMirror.js: Sending message...');
							const response = await context.postMessage('messageFromCodeMirrorContentScript');
							console.info('contentScriptCodeMirror.js: Got response', response);
						}
					})
				});
			},
		}
	},
}
