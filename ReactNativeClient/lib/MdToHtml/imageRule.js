const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;
const Resource = require('lib/models/Resource.js');
const utils = require('./utils');

function installRule(markdownIt, style, mdOptions, ruleOptions) {
	const defaultRender = markdownIt.renderer.rules.image;

	markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = utils.getAttr(token.attrs, 'src');
		const title = utils.getAttr(token.attrs, 'title');

		if (!Resource.isResourceUrl(src)) return defaultRender(tokens, idx, options, env, self);

		const resourceId = Resource.urlToId(src);
		const resource = ruleOptions.resources[resourceId];
		if (!resource) return defaultRender(tokens, idx, options, env, self);

		const mime = resource.mime ? resource.mime.toLowerCase() : '';
		if (Resource.isSupportedImageMimeType(mime)) {
			let realSrc = './' + Resource.filename(resource);
			if (ruleOptions.resourceBaseUrl !== null) realSrc = ruleOptions.resourceBaseUrl + realSrc;
			let output = '<img data-from-md data-resource-id="' + resource.id + '" title="' + htmlentities(title) + '" src="' + realSrc + '"/>';
			return output;
		}
	};
}

module.exports = function(style, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, style, mdOptions, ruleOptions);
	};
};