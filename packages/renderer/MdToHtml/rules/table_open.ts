export default {
	plugin: (markdownIt: any, params: any) => {
		markdownIt.renderer.rules.table_open = function(tokens: any[], idx: number, options: any, _env: any, self: any) {
			if (tokens[idx].map) {
				const line = tokens[idx].map[0];
				const lineEnd = tokens[idx].map[1];
				tokens[idx].attrJoin('class', 'maps-to-line');
				tokens[idx].attrSet('source-line', `${line}`);
				tokens[idx].attrSet('source-line-end', `${lineEnd}`);
			}
			const cur = String(self.renderToken(tokens, idx, options));
			return (params.tableLimitedInScreenWidth ?? false) ? `<div class="joplin-table-div">\n${cur}` : cur;
		};
	},
};
