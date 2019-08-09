// const stringPadding = require('string-padding');
const stringToStream = require('string-to-stream');
// const htmlFormat = require('html-format');

// const BLOCK_OPEN = '[[BLOCK_OPEN]]';
// const BLOCK_CLOSE = '[[BLOCK_CLOSE]]';
const NEWLINE = '[[NEWLINE]]';
// const NEWLINE_MERGED = '[[MERGED]]';
// const SPACE = '[[SPACE]]';

const imageMimeTypes = ['image/cgm', 'image/fits', 'image/g3fax', 'image/gif', 'image/ief', 'image/jp2', 'image/jpeg', 'image/jpm', 'image/jpx', 'image/naplps', 'image/png', 'image/prs.btif', 'image/prs.pti', 'image/t38', 'image/tiff', 'image/tiff-fx', 'image/vnd.adobe.photoshop', 'image/vnd.cns.inf2', 'image/vnd.djvu', 'image/vnd.dwg', 'image/vnd.dxf', 'image/vnd.fastbidsheet', 'image/vnd.fpx', 'image/vnd.fst', 'image/vnd.fujixerox.edmics-mmr', 'image/vnd.fujixerox.edmics-rlc', 'image/vnd.globalgraphics.pgb', 'image/vnd.microsoft.icon', 'image/vnd.mix', 'image/vnd.ms-modi', 'image/vnd.net-fpx', 'image/vnd.sealed.png', 'image/vnd.sealedmedia.softseal.gif', 'image/vnd.sealedmedia.softseal.jpg', 'image/vnd.svf', 'image/vnd.wap.wbmp', 'image/vnd.xiff'];

// TODO: write function like for checking imageMimeTypes index
const inlineHtmlElements = [
	'b',
	'big',
	'i',
	'small',
	'tt',
	'abbr',
	'acronym',
	'cite',
	'code',
	'dfn',
	'em',
	'kbd',
	'strong',
	'samp',
	'var',
	'a',
	'bdo',
	'br',
	'img',
	'map',
	'object',
	'q',
	'script',
	'span',
	'sub',
	'sup',
	'button',
	'input',
	'label',
	'select',
	'textarea',
];

// const randomHash = () => Math.random().toString(36).substring(2);

function isImageMimeType(m) {
	return imageMimeTypes.indexOf(m) >= 0;
}

class Char {
	constructor(stream, pos) {
		this.stream = stream;
		this.pos = pos;
	}
	get value() {
		return this.stream[this.pos];
	}
}
class Token {
	constructor(stream, start, end) {
		this.stream = stream;
		this.start = start;
		this.end = end;
	}
	get value() {
		return this.stream.slice(this.start, this.end);
	}
	get whitespace() {
		let i = this.start - 1;
		for (; i >= 0 && /\s/.test(this.stream[i]); i--)
			;
		return new Token(this.stream, i + 1, this.start);
	}
}
function nextChar(s, i, regex = /\S/g) {
	if (!regex.global)
		throw new Error('Regexp must be global');
	regex.lastIndex = i;
	const res = regex.exec(s);
	if (!res)
		return;
	return new Char(s, res.index);
}
function nextToken(s, i) {
	let char = nextChar(s, i);
	if (!char)
		return;
	const start = char.pos;
	char = nextChar(s, start + 1, /[\s<]|>/g);
	const end = char ? char.pos + Number(char.value == '>') : s.length;
	return new Token(s, start, end);
}
const voidTags = [
	'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
	'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
	'!doctype', '--',
];
function parseTokenValue(value) {
	let tagName = value.replace(/^<\/?|>$/g, '').toLowerCase();
	if (tagName.startsWith('!--') || tagName.endsWith('--'))
		tagName = '--';
	const isTagStart = /</.test(value);
	const isTagEnd = />/.test(value);
	const isStartTag = /<([^/]|$)/.test(value);
	const isEndTag = /<\//.test(value) || (isStartTag && voidTags.includes(tagName));
	return {
		isTagStart, isTagEnd, isStartTag, isEndTag, tagName,
	};
}
function htmlFormat(html) {
	const indent = '  ';
	const output = [];
	let inStartTag = false;
	let inEndTag = false;
	let inPre = false;
	let inSpecialElement = false;
	let tag = '';
	let indentLevel = 0;
	let prevState = {};
	let token;
	let i = 0;
	while ((token = nextToken(html, i)) !== null) {
		let tokenValue = token.value;
		let tokenWhitespaceValue = token.whitespace.value;
		let pendingWhitespace = '';
		let { isTagStart, isTagEnd, isStartTag, isEndTag, tagName } = parseTokenValue(tokenValue);
		// Token adjustments for edge cases
		if (!inSpecialElement) {
			// Remove space before tag name
			if (isTagStart && !tagName) {
				i = token.end;
				token = nextToken(html, i);
				if (!token)
					break;
				tokenValue += token.value;
				({ isTagStart, isTagEnd, isStartTag, isEndTag, tagName } =
									parseTokenValue(tokenValue));
			}
			// Split attributes stuck together
			if (!isTagStart && (inStartTag || inEndTag)) {
				// If attribute has end quote followed by another attribute
				const regex = /[^=]"[^>]/g;
				const res = regex.exec(tokenValue);
				if (res && token.end != token.start + res.index + 2) {
					token.end = token.start + res.index + 2;
					tokenValue = token.value;
					({ isTagStart, isTagEnd, isStartTag, isEndTag, tagName } =
											parseTokenValue(tokenValue));
					pendingWhitespace = indent;
				}
			}
		}
		if (!inSpecialElement && isStartTag)
			tag = tagName;
		const isEndSpecialTag = ((isEndTag && tagName != '--') || (isTagEnd && tagName == '--')) &&
					tagName == tag;
			// Ignore any tags inside special elements
		if (inSpecialElement && !isEndSpecialTag)
			isTagStart = isTagEnd = isStartTag = isEndTag = false;
			// Current State
		if (isStartTag)
			inStartTag = true;
		if (isEndTag)
			inEndTag = true;
		if (isEndTag && !isStartTag) // A void tag will be both
			--indentLevel;
		const isStartSpecialTag = (inStartTag && isTagEnd && ['script', 'style'].includes(tag)) ||
					(isStartTag && tag == '--');
			// Convenience
		const inTag = inStartTag || inEndTag;
		// Whitespace
		const whitespace = tokenWhitespaceValue || prevState.pendingWhitespace;
		const ignoreSpace = inTag && (/^[=">]([^=]|$)/.test(tokenValue) || /(^|=)"$/.test(prevState.tokenValue));
		// Preserve whitespace inside special and pre elements
		if (inSpecialElement || inPre)
			output.push(tokenWhitespaceValue);
		else if (whitespace && !ignoreSpace) {
			const numNewlines = (whitespace.match(/\n/g) || []).length;
			console.info('BEFORE', indentLevel, Number(inTag && !isTagStart));
			if (indentLevel < 0) {
				console.warn(output);
			}
			const indents = indent.repeat(indentLevel + Number(inTag && !isTagStart));
			console.info('AFTER');
			if (numNewlines)
				output.push(...Array(numNewlines).fill('\n'), indents);
			else
				output.push(' ');
		}
		output.push(tokenValue);
		prevState = {
			pendingWhitespace, tokenValue,
		};
		// Next state
		if (isStartSpecialTag)
			inSpecialElement = true;
		if (isEndSpecialTag)
			inSpecialElement = false;
		if (inStartTag && isTagEnd && tag == 'pre')
			inPre = true;
		if (isEndTag && tagName == 'pre')
			inPre = false;
		if (inStartTag && isTagEnd && !inEndTag) // A void tag is both start & end
			++indentLevel;
		if (isTagEnd)
			inStartTag = inEndTag = false;
		i = token.end;
	}
	if (html[html.length - 1] == '\n')
		output.push('\n');
	return output.join('');
}

function isSpanStyleBold(attributes) {
	let style = attributes.style;
	if (style.includes('font-weight: bold;')) {
		return true;
	} else if (style.search(/font-family:.*,Bold.*;/) != -1) {
		//console.debug('font-family regex matched');
		return true;
	} else {
		//console.debug('Found unsupported style(s) in span tag: %s', style);
		return false;
	}
}

function tagAttributeToMdText(attr) {
	// HTML attributes may contain newlines so remove them.
	// https://github.com/laurent22/joplin/issues/1583
	if (!attr) return '';
	attr = attr.replace(/[\n\r]+/g, ' ');
	attr = attr.replace(/\]/g, '\\]');
	return attr;
}

// function processMdArrayNewLines(md) {
// 	while (md.length && md[0] == BLOCK_OPEN) {
// 		md.shift();
// 	}

// 	while (md.length && md[md.length - 1] == BLOCK_CLOSE) {
// 		md.pop();
// 	}

// 	let temp = [];
// 	let last = '';
// 	for (let i = 0; i < md.length; i++) {
// 		let v = md[i];
// 		if (isNewLineBlock(last) && isNewLineBlock(v) && last == v) {
// 			// Skip it
// 		} else {
// 			temp.push(v);
// 		}
// 		last = v;
// 	}
// 	md = temp;

// 	temp = [];
// 	last = '';
// 	for (let i = 0; i < md.length; i++) {
// 		let v = md[i];
// 		if (last == BLOCK_CLOSE && v == BLOCK_OPEN) {
// 			temp.pop();
// 			temp.push(NEWLINE_MERGED);
// 		} else {
// 			temp.push(v);
// 		}
// 		last = v;
// 	}
// 	md = temp;

// 	temp = [];
// 	last = '';
// 	for (let i = 0; i < md.length; i++) {
// 		let v = md[i];
// 		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_CLOSE)) {
// 			// Skip it
// 		} else {
// 			temp.push(v);
// 		}
// 		last = v;
// 	}
// 	md = temp;

// 	// NEW!!!
// 	temp = [];
// 	last = '';
// 	for (let i = 0; i < md.length; i++) {
// 		let v = md[i];
// 		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_OPEN)) {
// 			// Skip it
// 		} else {
// 			temp.push(v);
// 		}
// 		last = v;
// 	}
// 	md = temp;

// 	if (md.length > 2) {
// 		if (md[md.length - 2] == NEWLINE_MERGED && md[md.length - 1] == NEWLINE) {
// 			md.pop();
// 		}
// 	}

// 	let output = '';
// 	let previous = '';
// 	let start = true;
// 	for (let i = 0; i < md.length; i++) {
// 		let v = md[i];
// 		let add = '';
// 		if (v == BLOCK_CLOSE || v == BLOCK_OPEN || v == NEWLINE || v == NEWLINE_MERGED) {
// 			add = '\n';
// 		} else if (v == SPACE) {
// 			if (previous == SPACE || previous == '\n' || start) {
// 				continue; // skip
// 			} else {
// 				add = ' ';
// 			}
// 		} else {
// 			add = v;
// 		}
// 		start = false;
// 		output += add;
// 		previous = add;
// 	}

// 	if (!output.trim().length) return '';

// 	// To simplify the result, we only allow up to one empty line between blocks of text
// 	const mergeMultipleNewLines = function(lines) {
// 		let output = [];
// 		let newlineCount = 0;
// 		for (let i = 0; i < lines.length; i++) {
// 			const line = lines[i];
// 			if (!line.trim()) {
// 				newlineCount++;
// 			} else {
// 				newlineCount = 0;
// 			}

// 			if (newlineCount >= 2) continue;

// 			output.push(line);
// 		}
// 		return output;
// 	};

// 	let lines = output.replace(/\\r/g, '').split('\n');
// 	lines = formatMdLayout(lines);
// 	lines = mergeMultipleNewLines(lines);
// 	return lines.join('\n');
// }

// const isHeading = function(line) {
// 	return !!line.match(/^#+\s/);
// };

// const isListItem = function(line) {
// 	return line && line.trim().indexOf('- ') === 0;
// };

// const isCodeLine = function(line) {
// 	return line && line.indexOf('\t') === 0;
// };

// const isTableLine = function(line) {
// 	return line.indexOf('| ') === 0;
// };

// const isPlainParagraph = function(line) {
// 	// Note: if a line is no longer than 80 characters, we don't consider it's a paragraph, which
// 	// means no newlines will be added before or after. This is to handle text that has been
// 	// written with "hard" new lines.
// 	if (!line || line.length < 80) return false;

// 	if (isListItem(line)) return false;
// 	if (isHeading(line)) return false;
// 	if (isCodeLine(line)) return false;
// 	if (isTableLine(line)) return false;

// 	return true;
// };

// function formatMdLayout(lines) {
// 	let previous = '';
// 	let newLines = [];
// 	for (let i = 0; i < lines.length; i++) {
// 		const line = lines[i];

// 		// Add a new line at the end of a list of items
// 		if (isListItem(previous) && line && !isListItem(line)) {
// 			newLines.push('');

// 			// Add a new line at the beginning of a list of items
// 		} else if (isListItem(line) && previous && !isListItem(previous)) {
// 			newLines.push('');

// 			// Add a new line before a heading
// 		} else if (isHeading(line) && previous) {
// 			newLines.push('');

// 			// Add a new line after a heading
// 		} else if (isHeading(previous) && line) {
// 			newLines.push('');
// 		} else if (isCodeLine(line) && !isCodeLine(previous)) {
// 			newLines.push('');
// 		} else if (!isCodeLine(line) && isCodeLine(previous)) {
// 			newLines.push('');
// 		} else if (isTableLine(line) && !isTableLine(previous)) {
// 			newLines.push('');
// 		} else if (!isTableLine(line) && isTableLine(previous)) {
// 			newLines.push('');

// 			// Add a new line at beginning of paragraph
// 		} else if (isPlainParagraph(line) && previous) {
// 			newLines.push('');

// 			// Add a new line at end of paragraph
// 		} else if (isPlainParagraph(previous) && line) {
// 			newLines.push('');
// 		}

// 		newLines.push(line);
// 		previous = newLines[newLines.length - 1];
// 	}

// 	return newLines;
// }

function addResourceTag(lines, resource, alt = '') {
	// Note: refactor to use Resource.markdownTag

	if (!alt) alt = resource.title;
	if (!alt) alt = resource.filename;
	if (!alt) alt = '';

	alt = tagAttributeToMdText(alt);
	if (isImageMimeType(resource.mime)) {
		lines.push(
			`
			<img src=":/${resource.id}" alt="${alt}" />
			`
		);
	} else {
		// TODO: haandle other mime types, including audio/x-m4a
		console.warn('mime type not recognized:', resource.mime);
		lines.push('[');
		lines.push(alt);
		lines.push('](:/' + resource.id + ')');
	}

	return lines;
}

// // Elements that don't require any special treatment beside adding a newline character
// function isNewLineOnlyEndTag(n) {
// 	return ['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dd', 'dt', 'center', 'address'].indexOf(n) >= 0;
// }

function attributeToLowerCase(node) {
	if (!node.attributes) return {};
	let output = {};
	for (let n in node.attributes) {
		if (!node.attributes.hasOwnProperty(n)) continue;
		output[n.toLowerCase()] = node.attributes[n];
	}
	return output;
}

function isSpanWithStyle(attributes, state) {
	if (attributes != undefined) {
		if ('style' in attributes) {
			return true;
		} else {
			return false;
		}
	}
}

function enexXmlToHtml_(stream, resources) {
	let remainingResources = resources.slice();

	const removeRemainingResource = id => {
		for (let i = 0; i < remainingResources.length; i++) {
			const r = remainingResources[i];
			if (r.id === id) {
				remainingResources.splice(i, 1);
			}
		}
	};

	return new Promise((resolve, reject) => {
		let state = {
			inCode: [],
			inPre: false,
			inQuote: false,
			lists: [],
			anchorAttributes: [],
			spanAttributes: [],
		};

		let options = {};
		let strict = false;
		var saxStream = require('sax').createStream(strict, options);

		let section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		saxStream.on('error', function(e) {
			console.warn(e);
			//reject(e);
		});

		// const unwrapInnerText = text => {
		// 	const lines = text.split('\n');

		// 	let output = '';

		// 	for (let i = 0; i < lines.length; i++) {
		// 		const line = lines[i];
		// 		const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

		// 		if (!line) {
		// 			output += '\n';
		// 			continue;
		// 		}

		// 		if (nextLine) {
		// 			output += line + ' ';
		// 		} else {
		// 			output += line;
		// 		}
		// 	}

		// 	return output;
		// };

		saxStream.on('text', function(text) {
		// 	if (['table', 'tr', 'tbody'].indexOf(section.type) >= 0) return;

			// 	text = !state.inPre ? unwrapInnerText(text) : text;
			// 	section.lines = collapseWhiteSpaceAndAppend(section.lines, state, text);
			section.lines.push(text);
		});

		saxStream.on('opentag', function(node) {
			const nodeAttributes = attributeToLowerCase(node);
			let tagName = node.name.toLowerCase();

			if (tagName == 'en-note') {
				// Start of note. Do nothing.
			} else if (tagName == 'img') {
				if (nodeAttributes.src) {
					// Many (most?) img tags don't have no source associated, especially when they were imported from HTML
					section.lines.push(
						`\n<img src="${nodeAttributes.src}" alt="${
							nodeAttributes.alt ? tagAttributeToMdText(nodeAttributes.alt) : ''
						}" />\n`
					);
				}
			} else if (tagName == 'en-todo') {
				// // let x = nodeAttributes && nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
				// // section.lines.push('- [' + x + '] ');
				// console.log(JSON.stringify({nodeAttributes}, null, 2))
				// section.lines.push(`<input type="checkbox"><label>`);
				// const checkboxId = randomHash();
				// const checkedState = nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? 'checked' : 'unchecked';
				section.lines.push(
					// TODO: maybe just live with the fact that you won't be able to toggle
					// checkboxes on old imported enex imports?
					// Not a big deal because we will only import as HTML for notes with a
					// URL in the metadata, implying that it was clipped from the web (rather
					// than a personal note).
					// TODO: in a separate PR, make it clear to the user what the consequences
					// of each import choice is.
					'<input type="checkbox" onclick="alert(\'This note was imported with the ENEX to HTML importer, so you cannot mark to-dos as complete in the preview.\\n\\nTo do so, please update the raw HTML in the editor.\'); return false;" />'
				);
			} else if (tagName == 'en-media') {
				const hash = nodeAttributes.hash;

				let resource = null;
				for (let i = 0; i < resources.length; i++) {
					let r = resources[i];
					if (r.id == hash) {
						resource = r;
						removeRemainingResource(r.id);
						break;
					}
				}

				if (!resource) {
					// This is a bit of a hack. Notes sometime have resources attached to it, but those <resource> tags don't contain
					// an "objID" tag, making it impossible to reference the resource. However, in this case the content of the note
					// will contain a corresponding <en-media/> tag, which has the ID in the "hash" attribute. All this information
					// has been collected above so we now set the resource ID to the hash attribute of the en-media tags. Here's an
					// example of note that shows this problem:

					//	<?xml version="1.0" encoding="UTF-8"?>
					//	<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export2.dtd">
					//	<en-export export-date="20161221T203133Z" application="Evernote/Windows" version="6.x">
					//		<note>
					//			<title>Commande</title>
					//			<content>
					//				<![CDATA[
					//					<?xml version="1.0" encoding="UTF-8"?>
					//					<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
					//					<en-note>
					//						<en-media alt="your QR code" hash="216a16a1bbe007fba4ccf60b118b4ccc" type="image/png"></en-media>
					//					</en-note>
					//				]]>
					//			</content>
					//			<created>20160921T203424Z</created>
					//			<updated>20160921T203438Z</updated>
					//			<note-attributes>
					//				<reminder-order>20160902T140445Z</reminder-order>
					//				<reminder-done-time>20160924T101120Z</reminder-done-time>
					//			</note-attributes>
					//			<resource>
					//				<data encoding="base64">........</data>
					//				<mime>image/png</mime>
					//				<width>150</width>
					//				<height>150</height>
					//			</resource>
					//		</note>
					//	</en-export>

					// Note that there's also the case of resources with no ID where the ID is actually the MD5 of the content.
					// This is handled in import-enex.js

					let found = false;
					for (let i = 0; i < remainingResources.length; i++) {
						let r = remainingResources[i];
						if (!r.id) {
							resource = Object.assign({}, r);
							resource.id = hash;
							remainingResources.splice(i, 1);
							found = true;
							break;
						}
					}

					if (!found) {
						console.warn('Hash with no associated resource: ' + hash);
					}
				}

				// If the resource does not appear among the note's resources, it
				// means it's an attachement. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource && !!resource.id) {
					section.lines = addResourceTag(section.lines, resource, nodeAttributes.alt);
					section.lines.push('\n');
				}
			} else if (tagName == 'br') {
				// Do nothing
			} else if (tagName == 'span') {
				if (isSpanWithStyle(nodeAttributes)) {
					state.spanAttributes.push(nodeAttributes);
					if (isSpanStyleBold(nodeAttributes)) {
						//console.debug('Applying style found in span tag: bold')
						section.lines.push('<strong>');
					} else {
						section.lines.push('<span>');
					}
				} else {
					section.lines.push('<span>');
				}
			} else if (inlineHtmlElements.includes(tagName)) {
				section.lines.push(`<${tagName}>`); // No newline for inline tags
			} else {
				section.lines.push(`<${tagName}>\n`); // TODO: don't forget to include closing tag
			}
		});

		saxStream.on('closetag', function(n) {
			n = n ? n.toLowerCase() : n;

			if (n == 'en-note') {
				// End of note, do nothing.
			} else if (n == 'br' || n == 'en-todo' || n == 'img' || n == 'en-media') {
				// Do nothing
			} else if (n == 'span') {
				let attributes = state.spanAttributes.pop();
				if (isSpanWithStyle(attributes) && isSpanStyleBold(attributes)) {
					//console.debug('Applying style found in span tag (closing): bold')
					section.lines.push('</strong>');
				} else {
					section.lines.push('</span>');
				}
			} else if (inlineHtmlElements.includes(n)) { // is inline tag
				section.lines.push(`</${n}>`); // No newline for inline tags
			} else { // is block tag
				section.lines.push(`\n</${n}>\n`); // TODO: don't forget to include closing tag
			}
		});

		saxStream.on('attribute', function(attr) {});

		saxStream.on('end', function() {
			resolve({
				content: section,
				resources: remainingResources,
			});
		});

		stream.pipe(saxStream);
	});
}

async function enexXmlToHtml(xmlString, resources, options = {}) {
	console.log(xmlString);
	const stream = stringToStream(xmlString);
	let result = await enexXmlToHtml_(stream, resources, options);

	let mdLines = [];

	let firstAttachment = true;
	for (let i = 0; i < result.resources.length; i++) {
		let r = result.resources[i];
		if (firstAttachment) mdLines.push(NEWLINE);
		mdLines.push(NEWLINE);
		mdLines = addResourceTag(mdLines, r, r.filename);
		firstAttachment = false;
	}

	// let output = processMdArrayNewLines(mdLines).split('\n');
	console.log(JSON.stringify({result, mdLines},null, 2));

	// output = postProcessMarkdown(output);

	// return result.content.lines.join('')
	// TODO: put htmlFormat back in
	return htmlFormat(result.content.lines.map(s => s.trim()).join(''));
	// return output.join('\n');
	// return 'ciao! 👋';
	// return xmlString;
}

// TODO: consider just not using the parser, or do it for sometthing else.
module.exports = { enexXmlToHtml,
	// processMdArrayNewLines,
	// , NEWLINE, addResourceTag
};


// TODO: Handle `RangeError: Invalid count value` when importing funny-cc-gp.
// NOTE: it has something to do with poorly-formed xml...
// NOTE: Looks like I resolved it (at least for the test cases I tried) by handling en-media.

// TODO: Consider taking the ENEX wholesale and then doing a series of substring
// substitutions (possibly with the parser too) rather than rebuilding everything
// with a parser, which loses so much.
