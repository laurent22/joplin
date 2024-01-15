const leftPad = require('left-pad');

export default function(context) { 
	return {
		plugin: function(markdownIt, _options) {
			const pluginId = context.pluginId;

			const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
				return self.renderToken(tokens, idx, options, env, self);
			};
		
			markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
				const token = tokens[idx];
				if (token.info !== 'justtesting') return defaultRender(tokens, idx, options, env, self);

				const postMessageWithResponseTest = `
					webviewApi.postMessage('${pluginId}', 'justtesting').then(function(response) {
						console.info('Got response in content script: ' + response);
					});
					return false;
				`;

				return `
					<div class="just-testing">
						<p>JUST TESTING: <pre>${leftPad(token.content.trim(), 10, 'x')}</pre></p>
						<p><a href="#" onclick="${postMessageWithResponseTest.replace(/\n/g, ' ')}">Click to post a message "justtesting" to plugin and check the response in the console</a></p>
					</div>
				`;
			};
		},
		assets: function() {
			return [
				{ name: 'markdownItTestPlugin.css' }
			];
		},
	}
}
