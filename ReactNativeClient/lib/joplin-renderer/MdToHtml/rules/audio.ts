const utils = require('../../utils');

function installRule(markdownIt:any, ruleOptions:any) {
	const defaultRender = markdownIt.renderer.rules.link_open;

	markdownIt.renderer.rules.link_open = (tokens: { [x: string]: any; }, idx: string | number, options: any, env: any, self: any) => {
		const Resource = ruleOptions.ResourceModel;

		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'href');

		if (!Resource.isResourceUrl(src) || ruleOptions.plainResourceRendering) return defaultRender(tokens, idx, options, env, self);

		const r = utils.resourceReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl);
		if (typeof r === 'string') return r;
		if (r && r.type === 'audio') return `<audio controls><source src='${r.src}'></audio><a href=# onclick=ipcProxySendToHost('joplin://${src.substring(2)}')>`;
		if (r && r.type === 'video') return `<video style="width:100%" controls><source src='${r.src}'></video>`;
		
		return defaultRender(tokens, idx, options, env, self);
	};
}

export default function(ruleOptions: any) {
	return function(md: any) {
		installRule(md, ruleOptions);
	};
};
