export default {
	plugin: (markdownIt: any, params: any) => {

		if (!params.mapsToLine) return;

		const allowed_levels = {
			paragraph_open: 0,
			heading_open: 0,
			// fence: 0, // fence uses custom rendering that doesn't propogate attr so it can't be used for now
			blockquote_open: 0,
			table_open: 0,
			code_block: 0,
			hr: 0,
			html_block: 0,
			list_item_open: 99, // this will stop matching if a list goes more than 99 indents deep
			math_block: 0,
		};

		for (const [key, allowed_level] of Object.entries(allowed_levels)) {
			const precedent_rule = markdownIt.renderer.rules[key];

			markdownIt.renderer.rules[key] = (tokens: any[], idx: number, options: any, env: any, self: any) => {
				if (!!tokens[idx].map && tokens[idx].level <= allowed_level) {
					const line = tokens[idx].map[0];
					tokens[idx].attrJoin('class', 'maps-to-line');
					tokens[idx].attrSet('source-line', `${line}`);
				}
				if (precedent_rule) {
					return precedent_rule(tokens, idx, options, env, self);
				} else {
					return self.renderToken(tokens, idx, options);
				}
			};
		}
	},
};
