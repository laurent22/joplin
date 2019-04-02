const MarkdownIt = require('markdown-it');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const { shim } = require('lib/shim.js');
const { _ } = require('lib/locale');
const md5 = require('md5');
const StringUtils = require('lib/string-utils.js');
const noteStyle = require('./MdToHtml/noteStyle');
const Setting = require('./models/Setting.js');
const rules = {
	image: require('./MdToHtml/rules/image'),
	checkbox: require('./MdToHtml/rules/checkbox'),
	katex: require('./MdToHtml/rules/katex'),
	link_open: require('./MdToHtml/rules/link_open'),
	html_block: require('./MdToHtml/rules/html_block'),
	html_inline: require('./MdToHtml/rules/html_inline'),
	highlight_keywords: require('./MdToHtml/rules/highlight_keywords'),
	code_inline: require('./MdToHtml/rules/code_inline'),
};
const setupLinkify = require('./MdToHtml/setupLinkify');
const hljs = require('highlight.js');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItToc = require('markdown-it-toc-done-right');
// The keys must match the corresponding entry in Setting.js
const plugins = {
	mark: require('markdown-it-mark'),
	footnote: require('markdown-it-footnote'),
	sub: require('markdown-it-sub'),
	sup: require('markdown-it-sup'),
	deflist: require('markdown-it-deflist'),
	abbr: require('markdown-it-abbr'),
	emoji: require('markdown-it-emoji'),
	insert: require('markdown-it-ins'),
	multitable: require('markdown-it-multimd-table'),
};

class MdToHtml {

	constructor(options = null) {
		if (!options) options = {};

		// Must include last "/"
		this.resourceBaseUrl_ = ('resourceBaseUrl' in options) ? options.resourceBaseUrl : null;

		this.cachedOutputs_ = {};
	}

	render(body, style, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';
		if (!options.highlightedKeywords) options.highlightedKeywords = [];

		const cacheKey = md5(escape(body + JSON.stringify(options) + JSON.stringify(style)));
		const cachedOutput = this.cachedOutputs_[cacheKey];
		if (cachedOutput) return cachedOutput;

		const context = {
			css: {},
			cssFiles: {},
			assetLoaders: {},
		};

		const markdownIt = new MarkdownIt({
			breaks: true,
			linkify: true,
			html: true,
			highlight: function(str, lang) {
				try {
					let hlCode = '';
					
					if (lang && hljs.getLanguage(lang)) {
						hlCode = hljs.highlight(lang, str, true).value;
					} else {
						hlCode = hljs.highlightAuto(str).value;
					}

					if (shim.isReactNative()) {
						context.css['hljs'] = shim.loadCssFromJs(options.codeTheme);
					} else {
						context.cssFiles['hljs'] = 'highlight/styles/' + options.codeTheme;
					}

					return '<pre class="hljs"><code>' + hlCode + '</code></pre>';
				} catch (error) {
					return '<pre class="hljs"><code>' + markdownIt.utils.escapeHtml(str) + '</code></pre>';
				}
			}
		});

		const ruleOptions = Object.assign({}, options, { resourceBaseUrl: this.resourceBaseUrl_ });

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
		markdownIt.use(rules.html_block(context, ruleOptions));
		if (Setting.value('markdown.plugin.katex'))
			markdownIt.use(rules.katex(context, ruleOptions));
		markdownIt.use(rules.highlight_keywords(context, ruleOptions));
		markdownIt.use(rules.code_inline(context, ruleOptions));
		markdownIt.use(markdownItAnchor)
		if (Setting.value('markdown.plugin.toc'))
			markdownIt.use(markdownItToc, { listType: 'ul' })

		for (let key in plugins) {
			if (Setting.value('markdown.plugin.' + key))
				markdownIt.use(plugins[key]);
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
				console.warn('MdToHtml: Error loading assets for ' + k + ': ', error.message);
			});
		}

		if (options.userCss) cssStrings.push(options.userCss);

		const styleHtml = '<style>' + cssStrings.join('\n') + '</style>';

		const html = styleHtml + '<div id="rendered-md">' + renderedBody + '</div>';

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
