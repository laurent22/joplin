function installRule(markdownIt, mdOptions, ruleOptions, context) {
	const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
		return self.renderToken(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		if (token.info !== 'justtesting') return defaultRender(tokens, idx, options, env, self);
		return `JUST TESTING: ${token.content}`;
	};
}

module.exports = function(pluginContext) {
	return 	{
		install: function(context, ruleOptions) {
			return function(md, mdOptions) {
				installRule(md, mdOptions, ruleOptions, context);
			};
		},
		style: {},
	}
}
