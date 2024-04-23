import MdToHtml from './MdToHtml';
import HtmlToHtml from './HtmlToHtml';
import htmlUtils from './htmlUtils';
import { Options as NoteStyleOptions } from './noteStyle';
import { AllHtmlEntities } from 'html-entities';
import { FsDriver, MarkupRenderer, MarkupToHtmlConverter, OptionsResourceModel, RenderOptions, RenderResult } from './types';
import defaultResourceModel from './defaultResourceModel';
const MarkdownIt = require('markdown-it');

export enum MarkupLanguage {
	Markdown = 1,
	Html = 2,
	Any = 3,
}

export interface Options {
	isSafeMode?: boolean;
	ResourceModel?: OptionsResourceModel;
	customCss?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	extraRendererRules?: any[];
	resourceBaseUrl?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginOptions?: any; // Not sure if needed
	tempDir?: string; // Not sure if needed
	fsDriver?: FsDriver; // Not sure if needed
}

export default class MarkupToHtml implements MarkupToHtmlConverter {

	public static MARKUP_LANGUAGE_MARKDOWN: number = MarkupLanguage.Markdown;
	public static MARKUP_LANGUAGE_HTML: number = MarkupLanguage.Html;

	private renderers_: Record<string, MarkupRenderer> = {};
	private options_: Options;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private rawMarkdownIt_: any;

	public constructor(options: Options = null) {
		this.options_ = {
			ResourceModel: defaultResourceModel,
			isSafeMode: false,
			...options,
		};
	}

	private renderer(markupLanguage: MarkupLanguage) {
		if (this.renderers_[markupLanguage]) return this.renderers_[markupLanguage];

		let RendererClass = null;

		if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
			RendererClass = MdToHtml;
		} else if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			RendererClass = HtmlToHtml;
		} else {
			throw new Error(`Invalid markup language: ${markupLanguage}`);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.renderers_[markupLanguage] = new RendererClass(this.options_ as any);
		return this.renderers_[markupLanguage];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public stripMarkup(markupLanguage: MarkupLanguage, markup: string, options: any = null) {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async render(markupLanguage: MarkupLanguage, markup: string, theme: any, options: RenderOptions): Promise<RenderResult> {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async allAssets(markupLanguage: MarkupLanguage, theme: any, noteStyleOptions: NoteStyleOptions = null) {
		return this.renderer(markupLanguage).allAssets(theme, noteStyleOptions);
	}
}
