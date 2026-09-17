import type MarkdownIt from 'markdown-it';
import type StateCore = require('markdown-it/lib/rules_core/state_core');

export default {
	plugin: (markdownIt: MarkdownIt) => {
		markdownIt.core.ruler.push('rtl_lists', (state: StateCore) => {
			for (const token of state.tokens) {
				if (token.type === 'list_item_open') {
					token.attrSet('dir', 'auto');
				}
			}
		});
	},
};
