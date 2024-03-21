import Logger from '@joplin/utils/Logger';
const logger = Logger.create('table_open');
import platformUtil from '@joplin/utils/platformUtil';

function tableOpenPlugin(markdownIt: any) {
	// const precedentRule = markdownIt.renderer.rules['table_open'];

	markdownIt.renderer.rules.table_open = function(tokens: any[], idx: number, options: any, _env: any, self: any) {
		if (tokens[idx].map) {
			const line = tokens[idx].map[0];
			const lineEnd = tokens[idx].map[1];
			tokens[idx].attrJoin('class', 'maps-to-line');
			tokens[idx].attrSet('source-line', `${line}`);
			tokens[idx].attrSet('source-line-end', `${lineEnd}`);
		}
		const cur = String(self.renderToken(tokens, idx, options));
		logger.info(`cur:${cur}`);
		return platformUtil.isMobile() ? `<div class="joplin-table-div" >\n${cur}` : cur;
	};
}

export default {
	plugin: tableOpenPlugin,
};
