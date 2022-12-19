const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const htmlparser2 = require('@joplin/fork-htmlparser2');

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;

const anchorRegex = /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi;

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

	attributesHtml(attr: any) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;

			if (!attr[n]) {
				output.push(n);
			} else {
				output.push(`${n}="${htmlentities(attr[n])}"`);
			}
		}

		return output.join(' ');
	}

	processImageTags(html: string, callback: Function) {
		if (!html) return '';

		return html.replace(imageRegex, (_v, before, src, after) => {
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

	processAnchorTags(html: string, callback: Function) {
		if (!html) return '';

		return html.replace(anchorRegex, (_v, before, href, after) => {
			const action = callback({ href: href });

			if (!action) return `<a${before}href="${href}"${after}>`;

			if (action.type === 'replaceElement') {
				return action.html;
			}

			if (action.type === 'replaceSource') {
				return `<img${before}href="${action.href}"${after}>`;
			}

			if (action.type === 'setAttributes') {
				const attrHtml = this.attributesHtml(action.attrs);
				return `<img${before}${attrHtml}${after}>`;
			}

			throw new Error(`Invalid action: ${action.type}`);
		});
	}

	isSelfClosingTag(tagName: string) {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	public stripHtml(html: string) {
		const output: string[] = [];

		const tagStack: string[] = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		const disallowedTags = ['script', 'style', 'head', 'iframe', 'frameset', 'frame', 'object', 'base'];

		const parser = new htmlparser2.Parser({

			onopentag: (name: string) => {
				tagStack.push(name.toLowerCase());
			},

			ontext: (decodedText: string) => {
				if (disallowedTags.includes(currentTag())) return;
				output.push(decodedText);
			},

			onclosetag: (name: string) => {
				if (currentTag() === name.toLowerCase()) tagStack.pop();
			},

		}, { decodeEntities: true });

		parser.write(html);
		parser.end();

		// In general, we want to get back plain text from this function, so all
		// HTML entities are decoded. Howver, to prevent XSS attacks, we
		// re-encode all the "<" characters, which should break any attempt to
		// inject HTML tags.

		return output.join('')
			.replace(/\s+/g, ' ')
			.replace(/</g, '&lt;');
	}

	public sanitizeHtml(html: string, options: any = null) {
		options = Object.assign({}, {
			// If true, adds a "jop-noMdConv" class to all the tags.
			// It can be used afterwards to restore HTML tags in Markdown.
			addNoMdConvClass: false,
		}, options);

		const output: string[] = [];

		const tagStack: string[] = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		// When we encounter a disallowed tag, all the other tags within it are
		// going to be skipped too. This is necessary to prevent certain XSS
		// attacks. See sanitize_11.md
		let disallowedTagDepth = 0;

		// The BASE tag allows changing the base URL from which files are
		// loaded, and that can break several plugins, such as Katex (which
		// needs to load CSS files using a relative URL). For that reason
		// it is disabled. More info:
		// https://github.com/laurent22/joplin/issues/3021
		//
		// "link" can be used to escape the parser and inject JavaScript.
		// Adding "meta" too for the same reason as it shouldn't be used in
		// notes anyway.
		const disallowedTags = [
			'script', 'iframe', 'frameset', 'frame', 'object', 'base',
			'embed', 'link', 'meta', 'noscript', 'button', 'form',
			'input', 'select', 'textarea', 'option', 'optgroup',
		];

		const parser = new htmlparser2.Parser({

			onopentag: (name: string, attrs: any) => {
				tagStack.push(name.toLowerCase());

				if (disallowedTags.includes(currentTag())) {
					disallowedTagDepth++;
					return;
				}

				if (disallowedTagDepth) return;

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

				// For some reason, entire parts of HTML notes don't show up in
				// the viewer when there's an anchor tag without an "href"
				// attribute. It doesn't always happen and it seems to depend on
				// what else is in the note but in any case adding the "href"
				// fixes it. https://github.com/laurent22/joplin/issues/5687
				if (name.toLowerCase() === 'a' && !attrs['href']) {
					attrs['href'] = '#';
				}

				let attrHtml = this.attributesHtml(attrs);
				if (attrHtml) attrHtml = ` ${attrHtml}`;
				const closingSign = this.isSelfClosingTag(name) ? '/>' : '>';
				output.push(`<${name}${attrHtml}${closingSign}`);
			},

			ontext: (decodedText: string) => {
				if (disallowedTagDepth) return;

				if (currentTag() === 'style') {
					// For CSS, we have to put the style as-is inside the tag because if we html-entities encode
					// it, it's not going to work. But it's ok because JavaScript won't run within the style tag.
					// Ideally CSS should be loaded from an external file.
					output.push(decodedText);
				} else {
					output.push(htmlentities(decodedText));
				}
			},

			onclosetag: (name: string) => {
				const current = currentTag();

				if (current === name.toLowerCase()) tagStack.pop();

				if (disallowedTags.includes(current)) {
					disallowedTagDepth--;
					return;
				}

				if (disallowedTagDepth) return;

				if (this.isSelfClosingTag(name)) return;
				output.push(`</${name}>`);
			},

		}, { decodeEntities: true });

		parser.write(html);
		parser.end();

		return output.join('');
	}


}

export default new HtmlUtils();
