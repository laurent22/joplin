import type * as MarkdownIt from 'markdown-it';
import type * as Renderer from 'markdown-it/lib/renderer';

const defaultRule = (markdownIt: MarkdownIt, key: keyof Renderer.RenderRuleRecord): Renderer.RenderRule => {
	if (markdownIt.renderer.rules[key]) return markdownIt.renderer.rules[key];
	return (tokens, idx, options, _env, renderer) => renderer.renderToken(tokens, idx, options);
};

export default defaultRule;
