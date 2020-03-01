const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

// [\s\S] instead of . for multiline matching
const NodeHtmlParser = require('node-html-parser');

// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const JS_EVENT_NAMES = ['onabort', 'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onblur', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'oncontextmenu', 'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus', 'onhashchange', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmessage', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpaste', 'onpause', 'onplay', 'onplaying', 'onpopstate', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onsearch', 'onseeked', 'onseeking', 'onselect', 'onstalled', 'onstorage', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'onunload', 'onvolumechange', 'onwaiting', 'onwheel'];

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

	sanitizeHtml(html) {
		const walkHtmlNodes = (nodes) => {
			if (!nodes || !nodes.length) return;

			for (const node of nodes) {
				for (const attr in node.attributes) {
					if (!node.attributes.hasOwnProperty(attr)) continue;
					if (JS_EVENT_NAMES.includes(attr)) node.setAttribute(attr, '');
				}
				walkHtmlNodes(node.childNodes);
			}
		};

		// Need to wrap in div, otherwise elements at the root will be skipped
		// The DIV tags are removed below
		const dom = NodeHtmlParser.parse(`<div>${html}</div>`, {
			script: false,
			style: true,
			pre: true,
			comment: false,
		});

		walkHtmlNodes([dom]);
		const output = dom.toString();
		return output.substr(5, output.length - 11);
	}


}

const htmlUtils = new HtmlUtils();

module.exports = htmlUtils;
