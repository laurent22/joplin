const MarkdownIt = require('markdown-it');
const md5 = require('md5');
const noteStyle = require('./noteStyle');
const { fileExtension } = require('./pathUtils');
const rules = {
	image: require('./MdToHtml/rules/image'),
	checkbox: require('./MdToHtml/rules/checkbox'),
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
					files.push(Object.assign({}, asset, {
						name: `${pluginName}/${asset.name}`,
						mime: mime,
					}));
				}
			}
		}

		return {
			files: files,
			cssStrings: cssStrings,
		};
	}

	async render(body, style = null, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';
		if (!options.highlightedKeywords) options.highlightedKeywords = [];
		if (!options.codeTheme) options.codeTheme = 'atom-one-light.css';

		if (!style) style = Object.assign({}, defaultNoteStyle);

		// The "codeHighlightCacheKey" option indicates what set of cached object should be
		// associated with this particular Markdown body. It is only used to allow us to
		// clear the cache whenever switching to a different note.
		// If "codeHighlightCacheKey" is not specified, code highlighting won't be cached.
		if (options.codeHighlightCacheKey !== this.lastCodeHighlightCacheKey_ || !options.codeHighlightCacheKey) {
			this.cachedHighlightedCode_ = {};
			this.lastCodeHighlightCacheKey_ = options.codeHighlightCacheKey;
		}

		const cacheKey = md5(escape(body + JSON.stringify(options) + JSON.stringify(style)));
		const cachedOutput = this.cachedOutputs_[cacheKey];
		if (cachedOutput) return cachedOutput;

		const context = {
			css: {},
			pluginAssets: {},
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
				try {
					let hlCode = '';

					const cacheKey = md5(`${str}_${lang}`);

					if (options.codeHighlightCacheKey && this.cachedHighlightedCode_[cacheKey]) {
						hlCode = this.cachedHighlightedCode_[cacheKey];
					} else {
						if (lang && hljs.getLanguage(lang)) {
							hlCode = hljs.highlight(lang, str, true).value;
						} else {
							hlCode = hljs.highlightAuto(str).value;
						}
						this.cachedHighlightedCode_[cacheKey] = hlCode;
					}

					context.pluginAssets['highlight.js'] = [
						{ name: options.codeTheme },
					];

					return `<pre class="hljs"><code>${hlCode}</code></pre>`;
				} catch (error) {
					return `<pre class="hljs"><code>${markdownIt.utils.escapeHtml(str)}</code></pre>`;
				}
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

		markdownIt.use(rules.image(context, ruleOptions));
		markdownIt.use(rules.checkbox(context, ruleOptions));
		markdownIt.use(rules.link_open(context, ruleOptions));
		markdownIt.use(rules.html_image(context, ruleOptions));
		if (this.pluginEnabled('katex')) markdownIt.use(rules.katex(context, ruleOptions));
		if (this.pluginEnabled('fountain')) markdownIt.use(rules.fountain(context, ruleOptions));
		if (this.pluginEnabled('mermaid')) markdownIt.use(rules.mermaid(context, ruleOptions));
		markdownIt.use(rules.highlight_keywords(context, ruleOptions));
		markdownIt.use(rules.code_inline(context, ruleOptions));
		markdownIt.use(markdownItAnchor, { slugify: uslugify });

		for (let key in plugins) {
			if (this.pluginEnabled(key)) markdownIt.use(plugins[key].module, plugins[key].options);
		}

		setupLinkify(markdownIt);

		const renderedBody = markdownIt.render(body);

		let cssStrings = noteStyle(style, options);

		const pluginAssets = this.processPluginAssets(context.pluginAssets);
		cssStrings = cssStrings.concat(pluginAssets.cssStrings);

		if (options.userCss) cssStrings.push(options.userCss);

		const styleHtml = `<style>${cssStrings.join('\n')}</style>`;

		const html = `${styleHtml}<div id="rendered-md">${renderedBody}</div>`;

		const output = {
			html: html,
			pluginAssets: pluginAssets.files.map(f => {
				return Object.assign({}, f, {
					path: `pluginAssets/${f.name}`,
				});
			}),
		};

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
