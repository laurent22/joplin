function addContextAssets(context) {
	if ('mermaid' in context.pluginAssets) return;

	context.pluginAssets['mermaid'] = [
		{ name: 'mermaid.min.js' },
		{ name: 'mermaid_render.js' },
		{
			inline: true,
			text: '.mermaid { background-color: white }',
			mime: 'text/css',
		},
	];
}

function installRule(markdownIt:any, mdOptions:any, ruleOptions:any, context:any) {
	const defaultRender:Function = markdownIt.renderer.rules.fence || function(tokens:any[], idx:number, options:any, env:any, self:any) {
		return self.renderToken(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.fence = function(tokens:any[], idx:number, options:{}, env:any, self:any) {
		const token = tokens[idx];
		if (token.info !== 'mermaid') return defaultRender(tokens, idx, options, env, self);
		addContextAssets(context);
		return `<div class="mermaid">${token.content}</div>`;
	};
}

export default function(context:any, ruleOptions:any) {
	return function(md:any, mdOptions:any) {
		installRule(md, mdOptions, ruleOptions, context);
	};
}
