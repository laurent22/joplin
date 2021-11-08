'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = {
	plugin: (markdownIt, params) => {
		if (!params.mapsToLine) { return; }
		const allowedLevels = {
			paragraph_open: 0,
			heading_open: 0,
			// fence: 0, // fence uses custom rendering that doesn't propogate attr so it can't be used for now
			blockquote_open: 0,
			table_open: 0,
			code_block: 0,
			hr: 0,
			html_block: 0,
			list_item_open: 99,
			math_block: 0,
		};
		for (const [key, allowedLevel] of Object.entries(allowedLevels)) {
			const precedentRule = markdownIt.renderer.rules[key];
			markdownIt.renderer.rules[key] = (tokens, idx, options, env, self) => {
				if (!!tokens[idx].map && tokens[idx].level <= allowedLevel) {
					const line = tokens[idx].map[0];
					tokens[idx].attrJoin('class', 'maps-to-line');
					tokens[idx].attrSet('source-line', `${line}`);
				}
				if (precedentRule) {
					return precedentRule(tokens, idx, options, env, self);
				} else {
					return self.renderToken(tokens, idx, options);
				}
			};
		}
	},
};
// # sourceMappingURL=source_map.js.map
