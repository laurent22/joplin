const MarkdownIt = require('markdown-it');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const ObjectUtils = require('lib/ObjectUtils');
const { shim } = require('lib/shim.js');
const { _ } = require('lib/locale');
const md5 = require('md5');
const MdToHtml_Katex = require('lib/MdToHtml_Katex');
const MdToHtml_Mermaid = require('lib/MdToHtml_Mermaid');
const StringUtils = require('lib/string-utils.js');
const noteStyle = require('./MdToHtml/noteStyle');
const rules = {
	image: require('./MdToHtml/rules/image'),
	checkbox: require('./MdToHtml/rules/checkbox'),
	katex: require('./MdToHtml/rules/katex'),
	link_open: require('./MdToHtml/rules/link_open'),
	html_block: require('./MdToHtml/rules/html_block'),
};
const setupLinkify = require('./MdToHtml/setupLinkify');
const hljs = require('highlight.js');

class MdToHtml {

	constructor(options = null) {
		if (!options) options = {};

		this.lastContext_ = null;
		// Must include last "/"
		this.resourceBaseUrl_ = ('resourceBaseUrl' in options) ? options.resourceBaseUrl : null;
	}

	lastRenderCssFiles() {
		const output = [];
		for (let n in this.lastContext_.cssFiles) {
			if (!this.lastContext_.cssFiles.hasOwnProperty(n)) continue;
			output.push(this.lastContext_.cssFiles[n]);
		}
		return output;
	}

	render(body, style, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';
		if (!options.highlightedKeywords) options.highlightedKeywords = [];

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
					context.cssFiles['hljs'] = 'highlight/styles/' + options.codeTheme;
					return '<pre class="hljs"><code>' + hlCode + '</code></pre>';
				} catch (error) {
					return '<pre class="hljs"><code>' + markdownIt.utils.escapeHtml(str) + '</code></pre>';
				}
			}
		});

		const ruleOptions = Object.assign({}, options, { resourceBaseUrl: this.resourceBaseUrl_ });

		markdownIt.use(rules.image(context, ruleOptions));
		markdownIt.use(rules.checkbox(context, ruleOptions));
		markdownIt.use(rules.link_open(context, ruleOptions));
		markdownIt.use(rules.html_block(context, ruleOptions));
		markdownIt.use(rules.katex(context, ruleOptions));

		setupLinkify(markdownIt);

		var hljs = require('highlight.js'); // https://highlightjs.org/

		let renderedBody = markdownIt.render(body);

		let cssStrings = noteStyle(style, options);

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

		const output = styleHtml + '<div id="rendered-md">' + renderedBody + '</div>';

		this.lastContext_ = context;

		return output;
	}

}

module.exports = MdToHtml;
