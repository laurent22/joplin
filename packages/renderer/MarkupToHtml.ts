import MdToHtml, { ExtraRendererRule } from './MdToHtml';
import HtmlToHtml from './HtmlToHtml';
import htmlUtils from './htmlUtils';
import { Options as NoteStyleOptions } from './noteStyle';
import { AllHtmlEntities } from 'html-entities';
import { FsDriver, MarkupLanguage, MarkupRenderer, MarkupToHtmlConverter, OptionsResourceModel, RenderOptions, RenderResult, RendererTheme } from './types';
import defaultResourceModel from './defaultResourceModel';
import type * as MarkdownItType from 'markdown-it';
const MarkdownIt = require('markdown-it');

export interface PluginOptions {
	[id: string]: { enabled: boolean };
}

export interface Options {
	isSafeMode?: boolean;
	ResourceModel?: OptionsResourceModel;
	customCss?: string;
	extraRendererRules?: ExtraRendererRule[];
	resourceBaseUrl?: string;
	pluginOptions?: PluginOptions; // Not sure if needed
	tempDir?: string; // Not sure if needed
	fsDriver?: FsDriver; // Not sure if needed
}

export default class MarkupToHtml implements MarkupToHtmlConverter {

	public static MARKUP_LANGUAGE_MARKDOWN: number = MarkupLanguage.Markdown;
	public static MARKUP_LANGUAGE_HTML: number = MarkupLanguage.Html;

	private renderers_: Record<string, MarkupRenderer> = {};
	private options_: Options;
	private rawMarkdownIt_: MarkdownItType;

	public constructor(options: Options = null) {
		this.options_ = {
			ResourceModel: defaultResourceModel,
			isSafeMode: false,
			...options,
		};
	}

	private renderer(markupLanguage: MarkupLanguage) {
		if (this.renderers_[markupLanguage]) return this.renderers_[markupLanguage];

		let renderer: MarkupRenderer;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			renderer = new MdToHtml(this.options_);
		} else if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			renderer = new HtmlToHtml(this.options_);
		} else {
			throw new Error(`Invalid markup language: ${markupLanguage}`);
		}

		this.renderers_[markupLanguage] = renderer;
		return this.renderers_[markupLanguage];
	}

	public stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: { collapseWhiteSpaces?: boolean } = null) {
		if (!markup) return '';

		options = { collapseWhiteSpaces: false, ...options };

		let output = markup;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			if (!this.rawMarkdownIt_) {
				// We enable HTML because we don't want it to be escaped, so
				// that it can be stripped off in the stripHtml call below.
				this.rawMarkdownIt_ = new MarkdownIt({ html: true });
			}
			output = this.rawMarkdownIt_.render(output);
		}

		output = htmlUtils.stripHtml(output).trim();

		if (options.collapseWhiteSpaces) {
			output = output.replace(/\n+/g, ' ');
			output = output.replace(/\s+/g, ' ');
		}

		return output;
	}

	public clearCache(markupLanguage: MarkupLanguage) {
		const r = this.renderer(markupLanguage);
		if (r.clearCache) r.clearCache();
	}

	public async render(markupLanguage: MarkupLanguage, markup: string, theme: RendererTheme, options: RenderOptions): Promise<RenderResult> {
		if (this.options_.isSafeMode) {
			const htmlentities = new AllHtmlEntities();
			return {
				html: `<pre>${htmlentities.encode(markup)}</pre>`,
				cssStrings: [],
				pluginAssets: [],
			};
		}
		return this.renderer(markupLanguage).render(markup, theme, options);
	}

	public async allAssets(markupLanguage: MarkupLanguage, theme: RendererTheme, noteStyleOptions: NoteStyleOptions = null) {
		return this.renderer(markupLanguage).allAssets(theme, noteStyleOptions);
	}
}
