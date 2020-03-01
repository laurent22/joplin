function installRule(markdownIt) {
	const defaultRender =
		markdownIt.renderer.rules.code_inline ||
		function(tokens, idx, options, env, self) {
			return self.renderToken(tokens, idx, options);
		};

	markdownIt.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		let tokenClass = token.attrGet('class');
		if (!tokenClass) tokenClass = '';
		tokenClass += ' inline-code';
		token.attrSet('class', tokenClass.trim());
		return defaultRender(tokens, idx, options, env, self);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
