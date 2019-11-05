const MarkdownIt = require('markdown-it');
const { shim } = require('lib/shim.js');
const md5 = require('md5');
const noteStyle = require('./noteStyle');
const Setting = require('lib/models/Setting.js');
const rules = {
	image: require('./MdToHtml/rules/image'),
	checkbox: require('./MdToHtml/rules/checkbox'),
	katex: require('./MdToHtml/rules/katex'),
	link_open: require('./MdToHtml/rules/link_open'),
	html_image: require('./MdToHtml/rules/html_image'),
	highlight_keywords: require('./MdToHtml/rules/highlight_keywords'),
	code_inline: require('./MdToHtml/rules/code_inline'),
	fountain: require('./MdToHtml/rules/fountain'),
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
	multitable: { module: require('markdown-it-multimd-table'), options: { enableMultilineRows: true, enableRowspan: true } },
	toc: { module: require('markdown-it-toc-done-right'), options: { listType: 'ul', slugify: uslugify } },
};

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
	}

	render(body, style, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';
		if (!options.highlightedKeywords) options.highlightedKeywords = [];

		// The "codeHighlightCacheKey" option indicates what set of cached object should be
		// associated with this particular Markdown body. It is only used to allow us to
		// clear the cache whenever switching to a different note.
		// If "codeHighlightCacheKey" is not specified, code highlighting won't be cached.
		if (options.codeHighlightCacheKey !== this.lastCodeHighlightCacheKey_ || !options.codeHighlightCacheKey) {
			this.cachedHighlightedCode_ = {};
			this.lastCodeHighlightCacheKey_ = options.codeHighlightCacheKey;
		}

		const breaks_ = Setting.value('markdown.softbreaks') ? false : true;
		const typographer_ = Setting.value('markdown.typographer') ? true : false;

		const cacheKey = md5(escape(body + JSON.stringify(options) + JSON.stringify(style)));
		const cachedOutput = this.cachedOutputs_[cacheKey];
		if (cachedOutput) return cachedOutput;

		const context = {
			css: {},
			cssFiles: {},
			assetLoaders: {},
		};

		const ruleOptions = Object.assign({}, options, { resourceBaseUrl: this.resourceBaseUrl_ });

		const markdownIt = new MarkdownIt({
			breaks: breaks_,
			typographer: typographer_,
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

					if (shim.isReactNative()) {
						context.css['hljs'] = shim.loadCssFromJs(options.codeTheme);
					} else {
						context.cssFiles['hljs'] = `highlight/styles/${options.codeTheme}`;
					}

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
		//    Using the `context` object, a plugin can send back either CSS strings (in .css) or CSS files that need
		//    to be loaded (in .cssFiles). In general, the desktop app will load the CSS files and the mobile app
		//    will load the CSS strings.

		markdownIt.use(rules.image(context, ruleOptions));
		markdownIt.use(rules.checkbox(context, ruleOptions));
		markdownIt.use(rules.link_open(context, ruleOptions));
		markdownIt.use(rules.html_image(context, ruleOptions));
		if (Setting.value('markdown.plugin.katex')) markdownIt.use(rules.katex(context, ruleOptions));
		if (Setting.value('markdown.plugin.fountain')) markdownIt.use(rules.fountain(context, ruleOptions));
		markdownIt.use(rules.highlight_keywords(context, ruleOptions));
		markdownIt.use(rules.code_inline(context, ruleOptions));
		markdownIt.use(markdownItAnchor, { slugify: uslugify });

		for (let key in plugins) {
			if (Setting.value(`markdown.plugin.${key}`)) markdownIt.use(plugins[key].module, plugins[key].options);
		}

		setupLinkify(markdownIt);

		const renderedBody = markdownIt.render(body);

		const cssStrings = noteStyle(style, options);

		for (let k in context.css) {
			if (!context.css.hasOwnProperty(k)) continue;
			cssStrings.push(context.css[k]);
		}

		for (let k in context.assetLoaders) {
			if (!context.assetLoaders.hasOwnProperty(k)) continue;
			context.assetLoaders[k]().catch(error => {
				console.warn(`MdToHtml: Error loading assets for ${k}: `, error.message);
			});
		}

		if (options.userCss) cssStrings.push(options.userCss);

		const styleHtml = `<style>${cssStrings.join('\n')}</style>`;

		const html = `${styleHtml}<div id="rendered-md">${renderedBody}</div>`;

		const output = {
			html: html,
			cssFiles: Object.keys(context.cssFiles).map(k => context.cssFiles[k]),
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
