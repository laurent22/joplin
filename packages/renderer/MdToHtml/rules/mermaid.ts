export default {

	assets: function() {
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
	},

	plugin: function(markdownIt: any) {
		const defaultRender: Function = markdownIt.renderer.rules.fence || function(tokens: any[], idx: number, options: any, env: any, self: any) {
			return self.renderToken(tokens, idx, options, env, self);
		};

		markdownIt.renderer.rules.fence = function(tokens: any[], idx: number, options: {}, env: any, self: any) {
			const token = tokens[idx];
			if (token.info !== 'mermaid') return defaultRender(tokens, idx, options, env, self);
			const contentHtml = markdownIt.utils.escapeHtml(token.content);
			// Note: The mermaid script (`contentHtml`) needs to be wrapped
			// in a `pre` tag, otherwise in WYSIWYG mode TinyMCE removes
			// all the white space from it, which causes mermaid to fail.
			// See PR #4670 https://github.com/laurent22/joplin/pull/4670
			return `
				<div class="joplin-editable">
					<pre class="joplin-source" data-joplin-language="mermaid" data-joplin-source-open="\`\`\`mermaid&#10;" data-joplin-source-close="&#10;\`\`\`&#10;">${contentHtml}</pre>
					<pre class="mermaid">${contentHtml}</pre>
				</div>
			`;
		};
	},
};
