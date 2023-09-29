export default {
	plugin: (markdownIt: any) => {
		// const precedentRule = markdownIt.renderer.rules['table_close'];

		markdownIt.renderer.rules.table_close = function(tokens: any[], idx: number, options: any, env: any, self: any) {
			const cur = String(self.renderToken(tokens, idx, options));
			return `${cur}</div>\n`;
		};
	},
};
