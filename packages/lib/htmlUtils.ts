const urlUtils = require('./urlUtils.js');
import { AllHtmlEntities as Entities } from 'html-entities';
const htmlentities = new Entities().encode;
import { escapeHtml } from './string-utils';

interface TagMatch {
	start: number;
	end: number;
	before: string;
	url: string;
	after: string;
}

const indexOfQuote = (text: string, fromIndex: number) => {
	for (let i = fromIndex; i < text.length; i++) {
		if (text[i] === '"' || text[i] === '\'') return i;
	}
	return -1;
};

// Same matches as `/<tag([\s\S]*?)attribute=["']([\s\S]*?)["']([\s\S]*?)>/gi`, in linear time. The regex takes
// quadratic time, because when no attribute, quote and closing bracket follow one tag, it is retried from every later
// tag, none of which can match either.
const findTags = (html: string, tagName: string, attributeName: string) => {
	const tagRegex = new RegExp(`<${tagName}`, 'gi');
	const attributeRegex = new RegExp(`${attributeName}=["']`, 'gi');
	const output: TagMatch[] = [];
	let tag: RegExpExecArray | null;

	while ((tag = tagRegex.exec(html)) !== null) {
		const tagEnd = tag.index + tag[0].length;
		attributeRegex.lastIndex = tagEnd;
		const attribute = attributeRegex.exec(html);
		if (!attribute) break;

		const urlStart = attribute.index + attribute[0].length;
		const urlEnd = indexOfQuote(html, urlStart);
		if (urlEnd === -1) break;

		const end = html.indexOf('>', urlEnd + 1);
		if (end === -1) break;

		output.push({
			start: tag.index,
			end: end + 1,
			before: html.substring(tagEnd, attribute.index),
			url: html.substring(urlStart, urlEnd),
			after: html.substring(urlEnd + 1, end),
		});
		tagRegex.lastIndex = end + 1;
	}

	return output;
};

const replaceTags = (html: string, tagName: string, attributeName: string, replace: (match: TagMatch)=> string) => {
	let output = '';
	let lastEnd = 0;
	for (const match of findTags(html, tagName, attributeName)) {
		output += html.substring(lastEnd, match.start) + replace(match);
		lastEnd = match.end;
	}
	return output + html.substring(lastEnd);
};

const isPdfUrl = (url: string) => url.toLowerCase().endsWith('.pdf');

type ReplaceUrlCallback = (url: string)=> string | void;

type ImageTagAction = { type: 'replaceSource'; src: string }
	| { type: 'replaceElement'; html: string }
	| { type: 'setAttributes'; attrs: Record<string, string> };

type ProcessImageTagCallback = (data: { src: string })=> ImageTagAction | null | undefined;

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

	public headAndBodyHtml(doc: Document) {
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	public isSelfClosingTag(tagName: string) {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	private extractUrls(html: string, tagName: string, attributeName: string) {
		if (!html) return [];
		return findTags(html, tagName, attributeName).map(match => match.url).filter(url => !!url);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractImageUrls(html: string) {
		return this.extractUrls(html, 'img', 'src');
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractPdfUrls(html: string) {
		return [...this.extractUrls(html, 'embed', 'src'), ...this.extractUrls(html, 'object', 'data')].filter(isPdfUrl);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractAnchorUrls(html: string) {
		return this.extractUrls(html, 'a', 'href');
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractFileUrls(html: string) {
		return this.extractImageUrls(html).concat(this.extractAnchorUrls(html));
	}

	public replaceResourceUrl(html: string, urlToReplace: string, id: string) {
		const htmlLinkRegex = `(?<=(?:src|href)=["'])${urlToReplace}(?=["'])`;
		const htmlReg = new RegExp(htmlLinkRegex, 'g');
		return html.replace(htmlReg, `:/${id}`);
	}

	public replaceImageUrls(html: string, callback: ReplaceUrlCallback) {
		return this.processImageTags(html, (data: { src: string }) => {
			const newSrc = callback(data.src);
			return {
				type: 'replaceSource',
				src: (newSrc as string) ?? '',
			};
		});
	}

	public replaceEmbedUrls(html: string, callback: ReplaceUrlCallback) {
		if (!html) return '';
		// We are adding the link as <a> since joplin disabled <embed>, <object> tags due to security reasons.
		// See: CVE-2020-15930
		const replaceWithLink = ({ url }: TagMatch) => `<a href="${callback(url)}">${escapeHtml(url)}</a>`;
		html = replaceTags(html, 'embed', 'src', replaceWithLink);
		html = replaceTags(html, 'object', 'data', replaceWithLink);
		return html;
	}

	public replaceMediaUrls(html: string, callback: ReplaceUrlCallback) {
		html = this.replaceImageUrls(html, callback);
		html = this.replaceEmbedUrls(html, callback);
		return html;
	}

	// Note that the URLs provided by this function are URL-encoded, which is
	// usually what you want for web URLs. But if they are file:// URLs and the
	// file path is going to be used, it will need to be unescaped first. The
	// transformed SRC, must also be escaped before being sent back to this
	// function.
	public processImageTags(html: string, callback: ProcessImageTagCallback) {
		if (!html) return '';

		return replaceTags(html, 'img', 'src', ({ before, url: src, after }) => {
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

			throw new Error(`Invalid action: ${(action as { type: string }).type}`);
		});
	}

	public prependBaseUrl(html: string, baseUrl: string) {
		if (!html) return '';

		return replaceTags(html, 'a', 'href', ({ before, url: href, after }) => {
			const newHref = urlUtils.prependBaseUrl(href, baseUrl);
			return `<a${before}href="${newHref}"${after}>`;
		});
	}

	public attributesHtml(attr: Record<string, string>) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(`${n}="${htmlentities(attr[n])}"`);
		}

		return output.join(' ');
	}

}

export default new HtmlUtils();

export function plainTextToHtml(plainText: string): string {
	const lines = plainText
		.replace(/\r\n/g, '\n')
		.split('\n');

	if (lines.length === 1) return escapeHtml(lines[0]);

	// Step 1: Merge adjacent lines into paragraphs, with each line separated by
	// '<br/>'. So 'one\ntwo' will become '<p>one</br>two</p>'

	const step1: string[] = [];
	let currentLine = '';

	for (let line of lines) {
		line = line.trimEnd();
		if (!line) {
			if (currentLine) {
				step1.push(`<p>${currentLine}</p>`);
				currentLine = '';
			}
			step1.push(line);
		} else {
			if (currentLine) {
				currentLine += `<br/>${escapeHtml(line)}`;
			} else {
				currentLine = escapeHtml(line);
			}
		}
	}

	if (currentLine) step1.push(`<p>${currentLine}</p>`);

	// Step 2: Convert the remaining empty lines to <br/> tags. Note that `n`
	// successive empty lines should produced `n-1` <br/> tags. This makes more
	// sense when looking at the tests.

	const step2: string[] = [];
	let newLineCount = 0;
	for (let i = 0; i < step1.length; i++) {
		const line = step1[i];

		if (!line) {
			newLineCount++;
			if (newLineCount >= 2) step2.push('');
		} else {
			newLineCount = 0;
			step2.push(line);
		}
	}

	// Step 3: Actually convert the empty lines to <br/> tags

	const step3: string[] = [];
	for (const line of step2) {
		step3.push(line ? line : '<br/>');
	}

	return step3.join('');
}
