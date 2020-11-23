import htmlUtils from './htmlUtils';
import linkReplacement from './MdToHtml/linkReplacement';
import utils from './utils';

// TODO: fix
// const Setting = require('@joplin/lib/models/Setting').default;
// const { themeStyle } = require('@joplin/lib/theme');
const InMemoryCache = require('./InMemoryCache').default;
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
}

interface RenderResult {
	html: string;
	pluginAssets: any[];
}

export default class HtmlToHtml {

	private resourceBaseUrl_;
	private ResourceModel_;
	private cache_;
	private fsDriver_: any;

	constructor(options: Options = null) {
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

	fsDriver() {
		return this.fsDriver_;
	}

	splitHtml(html: string) {
		const trimmedHtml = html.trimStart();
		if (trimmedHtml.indexOf('<style>') !== 0) return { html: html, css: '' };

		const closingIndex = trimmedHtml.indexOf('</style>');
		if (closingIndex < 0) return { html: html, css: '' };

		return {
			html: trimmedHtml.substr(closingIndex + 8),
			css: trimmedHtml.substr(7, closingIndex),
		};
	}

	async allAssets(/* theme*/): Promise<any[]> {
		return []; // TODO
	}

	// Note: the "theme" variable is ignored and instead the light theme is
	// always used for HTML notes.
	// See: https://github.com/laurent22/joplin/issues/3698
	async render(markup: string, _theme: any, options: RenderOptions): Promise<RenderResult> {
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

				const r = utils.imageReplacement(this.ResourceModel_, data.src, options.resources, this.resourceBaseUrl_);
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

				if (!r) return null;

				return {
					type: 'replaceElement',
					html: r,
				};
			});
		}

		this.cache_.setValue(cacheKey, html, 1000 * 60 * 10);

		if (options.bodyOnly) {
			return {
				html: html,
				pluginAssets: [],
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
		};
	}
}
