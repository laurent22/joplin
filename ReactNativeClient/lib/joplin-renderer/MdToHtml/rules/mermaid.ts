function style() {
	return [
		{ name: 'mermaid.min.js' },
		{ name: 'mermaid_render.js' },
		{
			inline: true,
			// Note: Mermaid is buggy when rendering below a certain width (500px?)
			// so set an arbitrarily high width here for the container. Once the
			// diagram is rendered it will be reset to 100% in mermaid_render.js
			text: '.mermaid { background-color: white; width: 640px; }',
			mime: 'text/css',
		},
	];
}

function addContextAssets(context:any) {
	if ('mermaid' in context.pluginAssets) return;

	context.pluginAssets['mermaid'] = style();
}

// @ts-ignore: Keep the function signature as-is despite unusued arguments
function installRule(markdownIt:any, mdOptions:any, ruleOptions:any, context:any) {
	const defaultRender:Function = markdownIt.renderer.rules.fence || function(tokens:any[], idx:number, options:any, env:any, self:any) {
		return self.renderToken(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.fence = function(tokens:any[], idx:number, options:{}, env:any, self:any) {
		const token = tokens[idx];
		if (token.info !== 'mermaid') return defaultRender(tokens, idx, options, env, self);
		addContextAssets(context);
		const contentHtml = markdownIt.utils.escapeHtml(token.content);
		return `
			<div class="joplin-editable">
				<pre class="joplin-source" data-joplin-language="mermaid" data-joplin-source-open="\`\`\`mermaid&#10;" data-joplin-source-close="&#10;\`\`\`&#10;">${contentHtml}</pre>
				<div class="mermaid">${contentHtml}</div>
			</div>
		`;
	};
}

export default {
	install: function(context:any, ruleOptions:any) {
		return function(md:any, mdOptions:any) {
			installRule(md, mdOptions, ruleOptions, context);
		};
	},
	style: style,
};
