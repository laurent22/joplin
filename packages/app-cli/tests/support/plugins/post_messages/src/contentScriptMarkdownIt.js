module.exports = {
	default: function(context) { 
		return {
			plugin: function(markdownIt, _options) {
				const contentScriptId = context.contentScriptId;

				const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
					return self.renderToken(tokens, idx, options, env, self);
				};
			
				markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
					const token = tokens[idx];
					if (token.info !== 'postMessageDemo') return defaultRender(tokens, idx, options, env, self);

					const postMessageWithResponseTest = `
						webviewApi.postMessage('${contentScriptId}', 'messageFromMarkdownIt').then(function(response) {
							console.info('Got response in Markdown-it content script: ' + response);
						});
						return false;
					`;

					return `
						<div style="padding:10px; border: 1px solid green;">
							<p>Plugin active! Content: <p><pre>${token.content}</pre><p></p>
							<p><a href="#" onclick="${postMessageWithResponseTest.replace(/\n/g, ' ')}">Click to post a message to plugin and check the response in the console</a></p>
						</div>
					`;
				};
			},
			assets: function() {
				return [];
			},
		}
	},
}
