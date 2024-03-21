export default {
	plugin: (markdownIt: any, params: any) => {
		markdownIt.renderer.rules.table_close = function(tokens: any[], idx: number, options: any, _env: any, self: any) {
			const cur = String(self.renderToken(tokens, idx, options));
			return (params.tableLimitedInScreenWidth ?? false) ? `${cur}</div>\n` : cur;
		};
	},
};
