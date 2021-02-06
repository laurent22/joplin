function plugin(markdownIt, _options) {
	const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
		return self.renderToken(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		if (token.info !== 'justtesting') return defaultRender(tokens, idx, options, env, self);
		return `
			<div class="just-testing">
				<p>JUST TESTING: ${token.content}</p>
			</div>
		`;
	};
}

module.exports = {
	default: function(_context) { 
		return {
			plugin: plugin,
			assets: function() {
				return [
					{ name: 'markdownItTestPlugin.css' }
				];
			},
		}
	},
}
