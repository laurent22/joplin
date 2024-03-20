import Logger from '@joplin/utils/Logger';
const logger = Logger.create('table_open');
import platformUtil from '@joplin/utils/platformUtil';

export default {
	plugin: (markdownIt: any) => {
		markdownIt.renderer.rules.table_close = function(tokens: any[], idx: number, options: any, _env: any, self: any) {
			const cur = String(self.renderToken(tokens, idx, options));
			logger.info(`cur:${cur}`);
			return platformUtil.isMobile() ? `${cur}</div>\n` : cur;
		};
	},
};
