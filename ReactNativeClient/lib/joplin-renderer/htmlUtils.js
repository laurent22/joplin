const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const JS_EVENT_NAMES = ['onabort', 'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onblur', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'oncontextmenu', 'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus', 'onhashchange', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmessage', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpaste', 'onpause', 'onplay', 'onplaying', 'onpopstate', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onsearch', 'onseeked', 'onseeking', 'onselect', 'onstalled', 'onstorage', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'onunload', 'onvolumechange', 'onwaiting', 'onwheel'];

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

	sanitizeHtml(html) {
		const htmlparser2 = require('htmlparser2');

		const output = [];

		const tagStack = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		const disallowedTags = ['script', 'iframe', 'frameset', 'frame', 'object'];

		const parser = new htmlparser2.Parser({

			onopentag: (name, attrs) => {
				tagStack.push(name.toLowerCase());

				if (disallowedTags.includes(currentTag())) return;

				attrs = Object.assign({}, attrs);
				for (const eventName of JS_EVENT_NAMES) {
					delete attrs[eventName];
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
