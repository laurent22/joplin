import htmlUtils from './htmlUtils';
import linkReplacement from './MdToHtml/linkReplacement';
import * as utils from './utils';
import InMemoryCache from './InMemoryCache';
import noteStyle, { whiteBackgroundNoteStyle } from './noteStyle';
import { Options as NoteStyleOptions } from './noteStyle';
import { FsDriver, MarkupRenderer, OptionsResourceModel, RenderOptions, RenderResult } from './types';
const md5 = require('md5');

// Renderered notes can potentially be quite large (for example
// when they come from the clipper) so keep the cache size
// relatively small.
const inMemoryCache = new InMemoryCache(10);

export interface SplittedHtml {
	html: string;
	css: string;
}

interface Options {
	ResourceModel: OptionsResourceModel;
	resourceBaseUrl?: string;
	fsDriver?: FsDriver;
}

// https://github.com/es-shims/String.prototype.trimStart/blob/main/implementation.js
function trimStart(s: string): string {
	// eslint-disable-next-line no-control-regex
	const startWhitespace = /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]*/;
	return s.replace(startWhitespace, '');
}

export default class HtmlToHtml implements MarkupRenderer {

	private resourceBaseUrl_;
	private ResourceModel_;
	private cache_;
	private fsDriver_: FsDriver;

	public constructor(options: Options = null) {
		options = {
			ResourceModel: null,
			...options,
		};

		this.resourceBaseUrl_ = 'resourceBaseUrl' in options ? options.resourceBaseUrl : null;
		this.ResourceModel_ = options.ResourceModel;
		this.cache_ = inMemoryCache;
		this.fsDriver_ = {
			writeFile: (/* path, content, encoding = 'base64'*/) => { throw new Error('writeFile not set'); },
			exists: (/* path*/) => { throw new Error('exists not set'); },
			cacheCssToFile: (/* cssStrings*/) => { throw new Error('cacheCssToFile not set'); },
		};

		if (options.fsDriver) {
			if (options.fsDriver.writeFile) this.fsDriver_.writeFile = options.fsDriver.writeFile;
			if (options.fsDriver.exists) this.fsDriver_.exists = options.fsDriver.exists;
			if (options.fsDriver.cacheCssToFile) this.fsDriver_.cacheCssToFile = options.fsDriver.cacheCssToFile;
		}
	}

	public fsDriver() {
		return this.fsDriver_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async allAssets(theme: any, noteStyleOptions: NoteStyleOptions = null) {
		let cssStrings: string[] = [];

		if (noteStyleOptions.whiteBackgroundNoteRendering) {
			cssStrings = [whiteBackgroundNoteStyle()];
		} else {
			cssStrings = [noteStyle(theme, noteStyleOptions).join('\n')];
		}

		return [await this.fsDriver().cacheCssToFile(cssStrings)];
	}

	public clearCache(): void {
		// TODO: Clear the in-memory cache
	}

	// Note: the "theme" variable is ignored and instead the light theme is
	// always used for HTML notes.
	// See: https://github.com/laurent22/joplin/issues/3698
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async render(markup: string, theme: any, options: RenderOptions): Promise<RenderResult> {
		options = {
			splitted: false,
			postMessageSyntax: 'postMessage',
			enableLongPress: false,
			...options,
		};

		const cacheKey = md5(escape(JSON.stringify({ markup, options })));
		let html = this.cache_.value(cacheKey);

		if (!html) {
			html = htmlUtils.sanitizeHtml(markup, {
				allowedFilePrefixes: options.allowedFilePrefixes,
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			html = htmlUtils.processImageTags(html, (data: any) => {
				if (!data.src) return null;

				const r = utils.imageReplacement(this.ResourceModel_, data.src, options.resources, this.resourceBaseUrl_, options.itemIdToUrl);
				if (!r) return null;

				if (typeof r === 'string') {
					return {
						type: 'replaceElement',
						html: r,
					};
				} else {
					return {
						type: 'setAttributes',
						attrs: r,
					};
				}
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			html = htmlUtils.processAnchorTags(html, (data: any) => {
				if (!data.href) return null;

				const r = linkReplacement(data.href, {
					resources: options.resources,
					ResourceModel: this.ResourceModel_,
					postMessageSyntax: options.postMessageSyntax,
					enableLongPress: options.enableLongPress,
					...options.plugins?.link_open,
				});

				if (!r.html) return null;

				return {
					type: 'replaceElement',
					html: r.html,
				};
			});
		}

		this.cache_.setValue(cacheKey, html, 1000 * 60 * 10);

		if (options.bodyOnly) {
			return {
				html: html,
				pluginAssets: [],
				cssStrings: [],
			};
		}

		let cssStrings = options.whiteBackgroundNoteRendering ? [whiteBackgroundNoteStyle()] : noteStyle(theme);

		if (options.splitted) {
			const splitted = splitHtml(html);
			cssStrings = [splitted.css].concat(cssStrings);

			const output: RenderResult = {
				html: splitted.html,
				pluginAssets: [],
				cssStrings: [],
			};

			if (options.externalAssetsOnly) {
				output.pluginAssets.push(await this.fsDriver().cacheCssToFile(cssStrings));
			}

			return output;
		}

		const styleHtml = `<style>${cssStrings.join('\n')}</style>`;

		return {
			html: styleHtml + html,
			pluginAssets: [],
			cssStrings: [],
		};
	}
}

const splitHtmlRegex = /^<style>([\s\S]*?)<\/style>([\s\S]*)$/i;

// This function is designed to handle the narrow case of HTML generated by the
// HtmlToHtml class and used by the Rich Text editor, and that's with the STYLE
// tag at the top, followed by the HTML code. If it's anything else, we don't
// try to handle it and return the whole HTML code.
export const splitHtml = (html: string): SplittedHtml => {
	const trimmedHtml = trimStart(html);
	const result = trimmedHtml.match(splitHtmlRegex);
	if (!result) return { html, css: '' };
	return { html: result[2], css: result[1] };
};
