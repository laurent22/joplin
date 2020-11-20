function plugin(markdownIt: any) {
	const defaultRender =
		markdownIt.renderer.rules.code_inline ||
		function(tokens: any, idx: any, options: any, _env: any, self: any) {
			return self.renderToken(tokens, idx, options);
		};

	markdownIt.renderer.rules.code_inline = (tokens: any[], idx: number, options: any, env: any, self: any) => {
		const token = tokens[idx];
		let tokenClass = token.attrGet('class');
		if (!tokenClass) tokenClass = '';
		tokenClass += ' inline-code';
		token.attrSet('class', tokenClass.trim());
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default {
	plugin,
};
