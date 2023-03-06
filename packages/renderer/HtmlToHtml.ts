import htmlUtils from './htmlUtils';
import linkReplacement from './MdToHtml/linkReplacement';
import utils, { ItemIdToUrlHandler } from './utils';

// TODO: fix
// import Setting from '@joplin/lib/models/Setting';
// const { themeStyle } = require('@joplin/lib/theme');
import InMemoryCache from './InMemoryCache';
import { RenderResult } from './MarkupToHtml';
const md5 = require('md5');

// Renderered notes can potentially be quite large (for example
// when they come from the clipper) so keep the cache size
// relatively small.
const inMemoryCache = new InMemoryCache(10);

interface FsDriver {
	writeFile: Function;
	exists: Function;
	cacheCssToFile: Function;
}

interface Options {
	ResourceModel: any;
	resourceBaseUrl?: string;
	fsDriver?: FsDriver;
}

interface RenderOptions {
	splitted: boolean;
	bodyOnly: boolean;
	externalAssetsOnly: boolean;
	resources: any;
	postMessageSyntax: string;
	enableLongPress: boolean;
	itemIdToUrl?: ItemIdToUrlHandler;
}

// https://github.com/es-shims/String.prototype.trimStart/blob/main/implementation.js
function trimStart(s: string): string {
	// eslint-disable-next-line no-control-regex
	const startWhitespace = /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]*/;
	return s.replace(startWhitespace, '');
}

export default class HtmlToHtml {

	private resourceBaseUrl_;
	private ResourceModel_;
	private cache_;
	private fsDriver_: any;

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

	public splitHtml(html: string) {
		const trimmedHtml = trimStart(html);
		if (trimmedHtml.indexOf('<style>') !== 0) return { html: html, css: '' };

		const closingIndex = trimmedHtml.indexOf('</style>');
		if (closingIndex < 0) return { html: html, css: '' };

		return {
			html: trimmedHtml.substr(closingIndex + 8),
			css: trimmedHtml.substr(7, closingIndex),
		};
	}

	public async allAssets(/* theme*/): Promise<any[]> {
		return []; // TODO
	}

	// Note: the "theme" variable is ignored and instead the light theme is
	// always used for HTML notes.
	// See: https://github.com/laurent22/joplin/issues/3698
	public async render(markup: string, _theme: any, options: RenderOptions): Promise<RenderResult> {
		options = {
			splitted: false,
			postMessageSyntax: 'postMessage',
			enableLongPress: false,
			...options,
		};

		const cacheKey = md5(escape(markup));
		let html = this.cache_.value(cacheKey);

		if (!html) {
			html = htmlUtils.sanitizeHtml(markup);

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

			html = htmlUtils.processAnchorTags(html, (data: any) => {
				if (!data.href) return null;

				const r = linkReplacement(data.href, {
					resources: options.resources,
					ResourceModel: this.ResourceModel_,
					postMessageSyntax: options.postMessageSyntax,
					enableLongPress: options.enableLongPress,
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

		// const lightTheme = themeStyle(Setting.THEME_LIGHT);
		// let cssStrings = noteStyle(lightTheme);
		let cssStrings: string[] = [];

		if (options.splitted) {
			const splitted = this.splitHtml(html);
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
