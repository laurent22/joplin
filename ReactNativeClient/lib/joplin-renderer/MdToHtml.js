const MarkdownIt = require('markdown-it');
const md5 = require('md5');
const noteStyle = require('./noteStyle');
const { fileExtension } = require('./pathUtils');
const memoryCache = require('memory-cache');

// /!\/!\ Note: the order of rules is important!! /!\/!\
const rules = {
	fence: require('./MdToHtml/rules/fence').default,
	sanitize_html: require('./MdToHtml/rules/sanitize_html').default,
	image: require('./MdToHtml/rules/image'),
	checkbox: require('./MdToHtml/rules/checkbox').default,
	katex: require('./MdToHtml/rules/katex'),
	link_open: require('./MdToHtml/rules/link_open'),
	html_image: require('./MdToHtml/rules/html_image'),
	highlight_keywords: require('./MdToHtml/rules/highlight_keywords'),
	code_inline: require('./MdToHtml/rules/code_inline'),
	fountain: require('./MdToHtml/rules/fountain'),
	mermaid: require('./MdToHtml/rules/mermaid').default,
};

const setupLinkify = require('./MdToHtml/setupLinkify');
const hljs = require('highlight.js');
const uslug = require('uslug');
const markdownItAnchor = require('markdown-it-anchor');
// The keys must match the corresponding entry in Setting.js
const plugins = {
	mark: { module: require('markdown-it-mark') },
	footnote: { module: require('markdown-it-footnote') },
	sub: { module: require('markdown-it-sub') },
	sup: { module: require('markdown-it-sup') },
	deflist: { module: require('markdown-it-deflist') },
	abbr: { module: require('markdown-it-abbr') },
	emoji: { module: require('markdown-it-emoji') },
	insert: { module: require('markdown-it-ins') },
	multitable: { module: require('markdown-it-multimd-table'), options: { multiline: true, rowspan: true, headerless: true } },
	toc: { module: require('markdown-it-toc-done-right'), options: { listType: 'ul', slugify: uslugify } },
	expand_tabs: { module: require('markdown-it-expand-tabs'), options: { tabWidth: 4 } },
};
const defaultNoteStyle = require('./defaultNoteStyle');

function uslugify(s) {
	return uslug(s);
}

class MdToHtml {
	constructor(options = null) {
		if (!options) options = {};

		// Must include last "/"
		this.resourceBaseUrl_ = 'resourceBaseUrl' in options ? options.resourceBaseUrl : null;

		this.cachedOutputs_ = {};

		this.lastCodeHighlightCacheKey_ = null;
		this.cachedHighlightedCode_ = {};
		this.ResourceModel_ = options.ResourceModel;
		this.pluginOptions_ = options.pluginOptions ? options.pluginOptions : {};
		this.contextCache_ = new memoryCache.Cache();

		this.tempDir_ = options.tempDir;
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

	tempDir() {
		return this.tempDir_;
	}

	static pluginNames() {
		const output = [];
		for (const n in rules) output.push(n);
		for (const n in plugins) output.push(n);
		return output;
	}

	pluginOptions(name) {
		let o = this.pluginOptions_[name] ? this.pluginOptions_[name] : {};
		o = Object.assign({
			enabled: true,
		}, o);
		return o;
	}

	pluginEnabled(name) {
		return this.pluginOptions(name).enabled;
	}

	processPluginAssets(pluginAssets) {
		const files = [];
		const cssStrings = [];
		for (const pluginName in pluginAssets) {
			for (const asset of pluginAssets[pluginName]) {
				let mime = asset.mime;

				if (!mime && asset.inline) throw new Error('Mime type is required for inline assets');

				if (!mime) {
					const ext = fileExtension(asset.name).toLowerCase();
					// For now it's only useful to support CSS and JS because that's what needs to be added
					// by the caller with <script> or <style> tags. Everything, like fonts, etc. is loaded
					// via CSS or some other ways.
					mime = 'application/octet-stream';
					if (ext === 'css') mime = 'text/css';
					if (ext === 'js') mime = 'application/javascript';
				}

				if (asset.inline) {
					if (mime === 'text/css') {
						cssStrings.push(asset.text);
					} else {
						throw new Error(`Unsupported inline mime type: ${mime}`);
					}
				} else {
					const name = `${pluginName}/${asset.name}`;
					files.push(Object.assign({}, asset, {
						name: name,
						path: `pluginAssets/${name}`,
						mime: mime,
					}));
				}
			}
		}

		return {
			pluginAssets: files,
			cssStrings: cssStrings,
		};
	}

	async allAssets(theme) {
		const assets = {};
		for (const key in rules) {
			if (!this.pluginEnabled(key)) continue;
			const rule = rules[key];

			if (rule.style) {
				assets[key] = rule.style(theme);
			}
		}

		const processedAssets = this.processPluginAssets(assets);
		processedAssets.cssStrings.splice(0, 0, noteStyle(theme));
		const output = await this.outputAssetsToExternalAssets_(processedAssets);
		return output.pluginAssets;
	}

	async outputAssetsToExternalAssets_(output) {
		for (const cssString of output.cssStrings) {
			output.pluginAssets.push(await this.fsDriver().cacheCssToFile(cssString));
		}
		delete output.cssStrings;
		return output;
	}

	// "style" here is really the theme, as returned by themeStyle()
	async render(body, theme = null, options = null) {
		options = Object.assign({}, {
			// In bodyOnly mode, the rendered Markdown is returned without the wrapper DIV
			bodyOnly: false,
			// In splitted mode, the CSS and HTML will be returned in separate properties.
			// In non-splitted mode, CSS and HTML will be merged in the same document.
			splitted: false,
			// When this is true, all assets such as CSS or JS are returned as external
			// files. Otherwise some of them might be in the cssStrings property.
			externalAssetsOnly: false,
			postMessageSyntax: 'postMessage',
			highlightedKeywords: [],
			codeTheme: 'atom-one-light.css',
			theme: Object.assign({}, defaultNoteStyle, theme),
			plugins: {},
		}, options);

		// The "codeHighlightCacheKey" option indicates what set of cached object should be
		// associated with this particular Markdown body. It is only used to allow us to
		// clear the cache whenever switching to a different note.
		// If "codeHighlightCacheKey" is not specified, code highlighting won't be cached.
		if (options.codeHighlightCacheKey !== this.lastCodeHighlightCacheKey_ || !options.codeHighlightCacheKey) {
			this.cachedHighlightedCode_ = {};
			this.lastCodeHighlightCacheKey_ = options.codeHighlightCacheKey;
		}

		const cacheKey = md5(escape(body + JSON.stringify(options) + JSON.stringify(options.theme)));
		const cachedOutput = this.cachedOutputs_[cacheKey];
		if (cachedOutput) return cachedOutput;

		const context = {
			css: {},
			pluginAssets: {},
			cache: this.contextCache_,
		};

		const ruleOptions = Object.assign({}, options, {
			resourceBaseUrl: this.resourceBaseUrl_,
			ResourceModel: this.ResourceModel_,
		});

		const markdownIt = new MarkdownIt({
			breaks: !this.pluginEnabled('softbreaks'),
			typographer: this.pluginEnabled('typographer'),
			linkify: true,
			html: true,
			highlight: (str, lang) => {
				let outputCodeHtml = '';

				// The strings includes the last \n that is part of the fence,
				// so we remove it because we need the exact code in the source block
				const trimmedStr = str.replace(/(.*)\n$/, '$1');
				const sourceBlockHtml = `<pre class="joplin-source" data-joplin-source-open="\`\`\`${lang}&#10;" data-joplin-source-close="&#10;\`\`\`">${markdownIt.utils.escapeHtml(trimmedStr)}</pre>`;

				try {
					let hlCode = '';

					const cacheKey = md5(`${str}_${lang}`);

					if (options.codeHighlightCacheKey && this.cachedHighlightedCode_[cacheKey]) {
						hlCode = this.cachedHighlightedCode_[cacheKey];
					} else {
						if (lang && hljs.getLanguage(lang)) {
							hlCode = hljs.highlight(lang, trimmedStr, true).value;
						} else {
							hlCode = hljs.highlightAuto(trimmedStr).value;
						}
						this.cachedHighlightedCode_[cacheKey] = hlCode;
					}

					context.pluginAssets['highlight.js'] = [
						{ name: options.codeTheme },
					];

					outputCodeHtml = hlCode;
				} catch (error) {
					outputCodeHtml = markdownIt.utils.escapeHtml(trimmedStr);
				}

				return {
					wrapCode: false,
					html: `<div class="joplin-editable">${sourceBlockHtml}<pre class="hljs"><code>${outputCodeHtml}</code></pre></div>`,
				};
			},
		});

		// To add a plugin, there are three options:
		//
		// 1. If the plugin does not need any application specific data, use the standard way:
		//
		//    const someMarkdownPlugin = require('someMarkdownPlugin');
		//    markdownIt.use(someMarkdownPlugin);
		//
		// 2. If the plugin does not need any application specific data, and you want the user
		//    to be able to toggle the plugin:
		//
		//    Add the plugin to the plugins object
		//    const plugins = {
		//      plugin: require('someMarkdownPlugin'),
		//    }
		//
		//    And add a corresponding entry into Setting.js
		//    'markdown.plugin.mark': {value: true, type: Setting.TYPE_BOOL, section: 'plugins', public: true, appTypes: ['mobile', 'desktop'], label: () => _('Enable ==mark== syntax')},
		//
		// 3. If the plugin needs application data (in ruleOptions) or needs to pass data (CSS, files to load, etc.) back
		//    to the application (using the context object), use the application-specific way:
		//
		//    const imagePlugin = require('./MdToHtml/rules/image');
		//    markdownIt.use(imagePlugin(context, ruleOptions));
		//
		// Using the `context` object, a plugin can define what additional assets they need (css, fonts, etc.) using context.pluginAssets.
		// The calling application will need to handle loading these assets.

		for (const key in rules) {
			if (!this.pluginEnabled(key)) continue;
			const rule = rules[key];
			const ruleInstall = rule.install ? rule.install : rule;
			markdownIt.use(ruleInstall(context, { ...ruleOptions }));
		}

		markdownIt.use(markdownItAnchor, { slugify: uslugify });

		for (const key in plugins) {
			if (this.pluginEnabled(key)) markdownIt.use(plugins[key].module, plugins[key].options);
		}

		setupLinkify(markdownIt);

		const renderedBody = markdownIt.render(body);

		let cssStrings = noteStyle(options.theme);

		let output = this.processPluginAssets(context.pluginAssets);
		cssStrings = cssStrings.concat(output.cssStrings);

		if (options.userCss) cssStrings.push(options.userCss);

		if (options.bodyOnly) {
			output.html = renderedBody;
			output.cssStrings = cssStrings;
		} else {
			const styleHtml = `<style>${cssStrings.join('\n')}</style>`;
			output.html = `${styleHtml}<div id="rendered-md">${renderedBody}</div>`;

			if (options.splitted) {
				output.cssStrings = cssStrings;
				output.html = `<div id="rendered-md">${renderedBody}</div>`;
			}
		}

		if (options.externalAssetsOnly) output = await this.outputAssetsToExternalAssets_(output);

		// Fow now, we keep only the last entry in the cache
		this.cachedOutputs_ = {};
		this.cachedOutputs_[cacheKey] = output;

		return output;
	}

	injectedJavaScript() {
		return '';
	}
}

module.exports = MdToHtml;
