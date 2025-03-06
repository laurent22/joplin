// This rule is used to add a media player for certain resource types below
// the link.

import { LinkRenderingType, RuleOptions } from '../../MdToHtml';
import renderMedia, { Options as RenderMediaOptions } from '../renderMedia';


export interface LinkIndexes {
	[key: string]: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function plugin(markdownIt: any, ruleOptions: RuleOptions) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const defaultRender = markdownIt.renderer.rules.link_close || function(tokens: any, idx: any, options: any, _env: any, self: any) {
		return self.renderToken(tokens, idx, options);
	};

	const linkIndexes: LinkIndexes = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	markdownIt.renderer.rules.link_close = function(tokens: any[], idx: number, options: any, env: any, self: any) {
		const defaultOutput = defaultRender(tokens, idx, options, env, self);
		const link = ruleOptions.context.currentLinks.pop();

		if (!link || ruleOptions.linkRenderingType === LinkRenderingType.HrefHandler || ruleOptions.plainResourceRendering) return defaultOutput;

		return [defaultOutput, renderMedia(link, ruleOptions as RenderMediaOptions, linkIndexes)].join('');
	};
}

export default { plugin };
