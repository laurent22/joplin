const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;

const selfClosingElements = [
	'area',
	'base',
	'basefont',
	'br',
	'col',
	'command',
	'embed',
	'frame',
	'hr',
	'img',
	'input',
	'isindex',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
];

class HtmlUtils {

	attributesHtml(attr) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(`${n}="${htmlentities(attr[n])}"`);
		}

		return output.join(' ');
	}

	processImageTags(html, callback) {
		if (!html) return '';

		return html.replace(imageRegex, (v, before, src, after) => {
			const action = callback({ src: src });

			if (!action) return `<img${before}src="${src}"${after}>`;

			if (action.type === 'replaceElement') {
				return action.html;
			}

			if (action.type === 'replaceSource') {
				return `<img${before}src="${action.src}"${after}>`;
			}

			if (action.type === 'setAttributes') {
				const attrHtml = this.attributesHtml(action.attrs);
				return `<img${before}${attrHtml}${after}>`;
			}

			throw new Error(`Invalid action: ${action.type}`);
		});
	}

	isSelfClosingTag(tagName) {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	sanitizeHtml(html, options = null) {
		options = Object.assign({}, {
			// If true, adds a "jop-noMdConv" class to all the tags.
			// It can be used afterwards to restore HTML tags in Markdown.
			addNoMdConvClass: false,
		}, options);

		const htmlparser2 = require('htmlparser2');

		const output = [];

		const tagStack = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		// The BASE tag allows changing the base URL from which files are loaded, and
		// that can break several plugins, such as Katex (which needs to load CSS
		// files using a relative URL). For that reason it is disabled.
		// More info: https://github.com/laurent22/joplin/issues/3021
		const disallowedTags = ['script', 'iframe', 'frameset', 'frame', 'object', 'base'];

		const parser = new htmlparser2.Parser({

			onopentag: (name, attrs) => {
				tagStack.push(name.toLowerCase());

				if (disallowedTags.includes(currentTag())) return;

				attrs = Object.assign({}, attrs);

				// Remove all the attributes that start with "on", which
				// normally should be JavaScript events. A better solution
				// would be to blacklist known events only but it seems the
				// list is not well defined [0] and we don't want any to slip
				// throught the cracks. A side effect of this change is a
				// regular harmless attribute that starts with "on" will also
				// be removed.
				// 0: https://developer.mozilla.org/en-US/docs/Web/Events
				for (const name in attrs) {
					if (!attrs.hasOwnProperty(name)) continue;
					if (name.length <= 2) continue;
					if (name.toLowerCase().substr(0, 2) !== 'on') continue;
					delete attrs[name];
				}

				if (options.addNoMdConvClass) {
					let classAttr = attrs['class'] || '';
					if (!classAttr.includes('jop-noMdConv')) {
						classAttr += ' jop-noMdConv';
						attrs['class'] = classAttr.trim();
					}
				}

				let attrHtml = this.attributesHtml(attrs);
				if (attrHtml) attrHtml = ` ${attrHtml}`;
				const closingSign = this.isSelfClosingTag(name) ? '/>' : '>';
				output.push(`<${name}${attrHtml}${closingSign}`);
			},

			ontext: (decodedText) => {
				if (disallowedTags.includes(currentTag())) return;

				if (currentTag() === 'style') {
					// For CSS, we have to put the style as-is inside the tag because if we html-entities encode
					// it, it's not going to work. But it's ok because JavaScript won't run within the style tag.
					// Ideally CSS should be loaded from an external file.
					output.push(decodedText);
				} else {
					output.push(htmlentities(decodedText));
				}
			},

			onclosetag: (name) => {
				const current = currentTag();

				if (current === name.toLowerCase()) tagStack.pop();

				if (disallowedTags.includes(current)) return;

				if (this.isSelfClosingTag(name)) return;
				output.push(`</${name}>`);
			},

		}, { decodeEntities: true });

		parser.write(html);
		parser.end();

		return output.join('');
	}


}

const htmlUtils = new HtmlUtils();

module.exports = htmlUtils;
