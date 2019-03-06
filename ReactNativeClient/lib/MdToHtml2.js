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
	image: require('./MdToHtml/imageRule'),
	checkbox: require('./MdToHtml/checkboxRule'),
	katex: require('./MdToHtml/katexRule'),
	linkOpen: require('./MdToHtml/linkOpenRule'),
};
const setupLinkify = require('./MdToHtml/setupLinkify');

class MdToHtml {

	constructor(options = null) {
		if (!options) options = {};

		// Must include last "/"
		this.resourceBaseUrl_ = ('resourceBaseUrl' in options) ? options.resourceBaseUrl : null;
	}

	render(body, style, options = null) {
		if (!options) options = {};
		if (!options.postMessageSyntax) options.postMessageSyntax = 'postMessage';
		if (!options.paddingBottom) options.paddingBottom = '0';
		if (!options.highlightedKeywords) options.highlightedKeywords = [];

		const markdownIt = new MarkdownIt({
			breaks: true,
			linkify: true,
			html: true,
		});

		const ruleOptions = Object.assign({}, options, { resourceBaseUrl: this.resourceBaseUrl_ });

		const context = {
			css: {},
			assetLoaders: {},
		};

		markdownIt.use(rules.image(context, ruleOptions));
		markdownIt.use(rules.checkbox(context, ruleOptions));
		markdownIt.use(rules.linkOpen(context, ruleOptions));
		markdownIt.use(rules.katex(context, ruleOptions));

		setupLinkify(markdownIt);

		const renderedBody = markdownIt.render(body);

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

		return output;
	}

}

module.exports = MdToHtml;
