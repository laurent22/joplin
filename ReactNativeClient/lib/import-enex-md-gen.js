const stringPadding = require('string-padding');
const stringToStream = require('string-to-stream');
const resourceUtils = require('lib/resourceUtils.js');

const BLOCK_OPEN = '[[BLOCK_OPEN]]';
const BLOCK_CLOSE = '[[BLOCK_CLOSE]]';
const NEWLINE = '[[NEWLINE]]';
const NEWLINE_MERGED = '[[MERGED]]';
const SPACE = '[[SPACE]]';

function processMdArrayNewLines(md) {
	while (md.length && md[0] == BLOCK_OPEN) {
		md.shift();
	}

	while (md.length && md[md.length - 1] == BLOCK_CLOSE) {
		md.pop();
	}

	let temp = [];
	let last = '';
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		if (isNewLineBlock(last) && isNewLineBlock(v) && last == v) {
			// Skip it
		} else {
			temp.push(v);
		}
		last = v;
	}
	md = temp;

	temp = [];
	last = '';
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		if (last == BLOCK_CLOSE && v == BLOCK_OPEN) {
			temp.pop();
			temp.push(NEWLINE_MERGED);
		} else {
			temp.push(v);
		}
		last = v;
	}
	md = temp;

	temp = [];
	last = '';
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_CLOSE)) {
			// Skip it
		} else {
			temp.push(v);
		}
		last = v;
	}
	md = temp;

	// NEW!!!
	temp = [];
	last = '';
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_OPEN)) {
			// Skip it
		} else {
			temp.push(v);
		}
		last = v;
	}
	md = temp;

	if (md.length > 2) {
		if (md[md.length - 2] == NEWLINE_MERGED && md[md.length - 1] == NEWLINE) {
			md.pop();
		}
	}

	let output = '';
	let previous = '';
	let start = true;
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		let add = '';
		if (v == BLOCK_CLOSE || v == BLOCK_OPEN || v == NEWLINE || v == NEWLINE_MERGED) {
			add = '\n';
		} else if (v == SPACE) {
			if (previous == SPACE || previous == '\n' || start) {
				continue; // skip
			} else {
				add = ' ';
			}
		} else {
			add = v;
		}
		start = false;
		output += add;
		previous = add;
	}

	if (!output.trim().length) return '';

	// To simplify the result, we only allow up to one empty line between blocks of text
	const mergeMultipleNewLines = function(lines) {
		let output = [];
		let newlineCount = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim()) {
				newlineCount++;
			} else {
				newlineCount = 0;
			}

			if (newlineCount >= 2) continue;

			output.push(line);
		}
		return output;
	};

	let lines = output.replace(/\\r/g, '').split('\n');
	lines = formatMdLayout(lines);
	lines = mergeMultipleNewLines(lines);
	return lines.join('\n');
}

// While the processMdArrayNewLines() function adds newlines in a way that's technically correct, the resulting Markdown can look messy.
// This is because while a "block" element should be surrounded by newlines, in practice, some should be surrounded by TWO new lines, while
// others by only ONE.
//
// For instance, this:
//
//     <li>one</li>
//     <li>two</li>
//     <li>three</li>
//
// should result in this:
//
//     - one
//     - two
//     - three
//
// While this:
//
//     <p>Some long paragraph</p><p>And another one</p><p>And the last paragraph</p>
//
// should result in this:
//
//     Some long paragraph
//
//     And another one
//
//     And the last paragraph
//
// So in one case, one newline between tags, and in another two newlines. In HTML this would be done via CSS, but in Markdown we need
// to add new lines. It's also important to get these newlines right because two blocks of text next to each others might be renderered
// differently than if there's a newlines between them. So the function below parses the almost final MD and add new lines depending
// on various rules.

const isHeading = function(line) {
	return !!line.match(/^#+\s/);
};

const isListItem = function(line) {
	return line && line.trim().indexOf('- ') === 0;
};

const isCodeLine = function(line) {
	return line && line.indexOf('\t') === 0;
};

const isTableLine = function(line) {
	return line.indexOf('| ') === 0;
};

const isPlainParagraph = function(line) {
	// Note: if a line is no longer than 80 characters, we don't consider it's a paragraph, which
	// means no newlines will be added before or after. This is to handle text that has been
	// written with "hard" new lines.
	if (!line || line.length < 80) return false;

	if (isListItem(line)) return false;
	if (isHeading(line)) return false;
	if (isCodeLine(line)) return false;
	if (isTableLine(line)) return false;

	return true;
};

function formatMdLayout(lines) {
	let previous = '';
	let newLines = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Add a new line at the end of a list of items
		if (isListItem(previous) && line && !isListItem(line)) {
			newLines.push('');

			// Add a new line at the beginning of a list of items
		} else if (isListItem(line) && previous && !isListItem(previous)) {
			newLines.push('');

			// Add a new line before a heading
		} else if (isHeading(line) && previous) {
			newLines.push('');

			// Add a new line after a heading
		} else if (isHeading(previous) && line) {
			newLines.push('');
		} else if (isCodeLine(line) && !isCodeLine(previous)) {
			newLines.push('');
		} else if (!isCodeLine(line) && isCodeLine(previous)) {
			newLines.push('');
		} else if (isTableLine(line) && !isTableLine(previous)) {
			newLines.push('');
		} else if (!isTableLine(line) && isTableLine(previous)) {
			newLines.push('');

			// Add a new line at beginning of paragraph
		} else if (isPlainParagraph(line) && previous) {
			newLines.push('');

			// Add a new line at end of paragraph
		} else if (isPlainParagraph(previous) && line) {
			newLines.push('');
		}

		newLines.push(line);
		previous = newLines[newLines.length - 1];
	}

	return newLines;
}

function isWhiteSpace(c) {
	return c == '\n' || c == '\r' || c == '\v' || c == '\f' || c == '\t' || c == ' ';
}

// Like QString::simpified(), except that it preserves non-breaking spaces (which
// Evernote uses for identation, etc.)
function simplifyString(s) {
	let output = '';
	let previousWhite = false;
	for (let i = 0; i < s.length; i++) {
		let c = s[i];
		let isWhite = isWhiteSpace(c);
		if (previousWhite && isWhite) {
			// skip
		} else {
			output += c;
		}
		previousWhite = isWhite;
	}

	while (output.length && isWhiteSpace(output[0])) output = output.substr(1);
	while (output.length && isWhiteSpace(output[output.length - 1])) output = output.substr(0, output.length - 1);

	return output;
}

function collapseWhiteSpaceAndAppend(lines, state, text) {
	if (state.inCode.length) {
		lines.push(text);
	} else {
		// Remove all \n and \r from the left and right of the text
		while (text.length && (text[0] == '\n' || text[0] == '\r')) text = text.substr(1);
		while (text.length && (text[text.length - 1] == '\n' || text[text.length - 1] == '\r')) text = text.substr(0, text.length - 1);

		// Collapse all white spaces to just one. If there are spaces to the left and right of the string
		// also collapse them to just one space.
		let spaceLeft = text.length && text[0] == ' ';
		let spaceRight = text.length && text[text.length - 1] == ' ';
		text = simplifyString(text);

		if (!spaceLeft && !spaceRight && text == '') return lines;

		if (state.inQuote) {
			// Add a ">" at the beginning of the block then at the beginning of each lines. So it turns this:
			// "my quote\nsecond line" into this => "> my quote\n> second line"
			lines.push('> ');
			if (lines.indexOf('\r') >= 0) {
				text = text.replace(/\n\r/g, '\n\r> ');
			} else {
				text = text.replace(/\n/g, '\n> ');
			}
		}

		if (spaceLeft) lines.push(SPACE);
		lines.push(text);
		if (spaceRight) lines.push(SPACE);
	}

	return lines;
}

function tagAttributeToMdText(attr) {
	// HTML attributes may contain newlines so remove them.
	// https://github.com/laurent22/joplin/issues/1583
	if (!attr) return '';
	attr = attr.replace(/[\n\r]+/g, ' ');
	attr = attr.replace(/\]/g, '\\]');
	return attr;
}

function addResourceTag(lines, resource, alt = '') {
	// Note: refactor to use Resource.markdownTag

	if (!alt) alt = resource.title;
	if (!alt) alt = resource.filename;
	if (!alt) alt = '';

	alt = tagAttributeToMdText(alt);
	if (resourceUtils.isImageMimeType(resource.mime)) {
		lines.push('![');
		lines.push(alt);
		lines.push(`](:/${resource.id})`);
	} else {
		lines.push('[');
		lines.push(alt);
		lines.push(`](:/${resource.id})`);
	}

	return lines;
}

function isBlockTag(n) {
	return ['div', 'p', 'dl', 'dd', 'dt', 'center', 'address'].indexOf(n) >= 0;
}

function isStrongTag(n) {
	return n == 'strong' || n == 'b' || n == 'big';
}

function isStrikeTag(n) {
	return n == 'strike' || n == 's' || n == 'del';
}

function isEmTag(n) {
	return n == 'em' || n == 'i' || n == 'u';
}

function isAnchor(n) {
	return n == 'a';
}

function isIgnoredEndTag(n) {
	return ['en-note', 'en-todo', 'body', 'html', 'font', 'br', 'hr', 'tbody', 'sup', 'img', 'abbr', 'cite', 'thead', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area'].indexOf(n) >= 0;
}

function isListTag(n) {
	return n == 'ol' || n == 'ul';
}

// Elements that don't require any special treatment beside adding a newline character
function isNewLineOnlyEndTag(n) {
	return ['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dd', 'dt', 'center', 'address'].indexOf(n) >= 0;
}

function isInlineCodeTag(n) {
	return ['samp', 'kbd'].indexOf(n) >= 0;
}

function isNewLineBlock(s) {
	return s == BLOCK_OPEN || s == BLOCK_CLOSE;
}

function attributeToLowerCase(node) {
	if (!node.attributes) return {};
	let output = {};
	for (let n in node.attributes) {
		if (!node.attributes.hasOwnProperty(n)) continue;
		output[n.toLowerCase()] = node.attributes[n];
	}
	return output;
}

function isSpanWithStyle(attributes) {
	if (attributes != undefined) {
		if ('style' in attributes) {
			return true;
		} else {
			return false;
		}
	}
}

function isSpanStyleBold(attributes) {
	let style = attributes.style;
	if (style.includes('font-weight: bold;')) {
		return true;
	} else if (style.search(/font-family:.*,Bold.*;/) != -1) {
		// console.debug('font-family regex matched');
		return true;
	} else {
		// console.debug('Found unsupported style(s) in span tag: %s', style);
		return false;
	}
}

function isSpanStyleItalic(attributes) {
	let style = attributes.style;
	style = style.replace(/\s+/g, '');
	return (style.toLowerCase().includes('font-style:italic;'));
}

function enexXmlToMdArray(stream, resources) {
	let remainingResources = resources.slice();

	const removeRemainingResource = id => {
		for (let i = 0; i < remainingResources.length; i++) {
			const r = remainingResources[i];
			if (r.id === id) {
				remainingResources.splice(i, 1);
			}
		}
	};

	return new Promise((resolve) => {
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
		});

		const unwrapInnerText = text => {
			const lines = text.split('\n');

			let output = '';

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

				if (!line) {
					output += '\n';
					continue;
				}

				if (nextLine) {
					output += `${line} `;
				} else {
					output += line;
				}
			}

			return output;
		};

		saxStream.on('text', function(text) {
			if (['table', 'tr', 'tbody'].indexOf(section.type) >= 0) return;

			text = !state.inPre ? unwrapInnerText(text) : text;
			section.lines = collapseWhiteSpaceAndAppend(section.lines, state, text);
		});

		saxStream.on('opentag', function(node) {
			const nodeAttributes = attributeToLowerCase(node);
			let n = node.name.toLowerCase();

			const currentList = state.lists && state.lists.length ? state.lists[state.lists.length - 1] : null;

			// Kind of a hack: If we are inside a list, at the beginning of an item (when a "- " or "1. " has been added
			// but no other text yet), if the current tag is eg. a <div> or any other block tag, we skip it, so that a new line
			// does not get created. It is to handle list4.html test case.
			// https://github.com/laurent22/joplin/issues/832
			if (currentList) {
				if (!currentList.startedText && isBlockTag(n)) return;
				currentList.startedText = true;
			}

			if (n == 'en-note') {
				// Start of note
			} else if (isBlockTag(n)) {
				section.lines.push(BLOCK_OPEN);
			} else if (n == 'table') {
				let newSection = {
					type: 'table',
					lines: [],
					parent: section,
				};
				section.lines.push(newSection);
				section = newSection;
			} else if (n == 'tbody' || n == 'thead') {
				// Ignore it
			} else if (n == 'tr') {
				if (section.type != 'table') {
					console.warn('Found a <tr> tag outside of a table');
					return;
				}

				let newSection = {
					type: 'tr',
					lines: [],
					parent: section,
					isHeader: false,
				};

				section.lines.push(newSection);
				section = newSection;
			} else if (n == 'td' || n == 'th') {
				if (section.type != 'tr') {
					console.warn('Found a <td> tag outside of a <tr>');
					return;
				}

				if (n == 'th') section.isHeader = true;

				let newSection = {
					type: 'td',
					lines: [],
					parent: section,
				};

				section.lines.push(newSection);
				section = newSection;
			} else if (isListTag(n)) {
				section.lines.push(BLOCK_OPEN);
				state.lists.push({ tag: n, counter: 1, startedText: false });
			} else if (n == 'li') {
				section.lines.push(BLOCK_OPEN);
				if (!state.lists.length) {
					console.warn('Found <li> tag without being inside a list');
					return;
				}

				let container = state.lists[state.lists.length - 1];
				container.startedText = false;

				const indent = '    '.repeat(state.lists.length - 1);
				if (container.tag == 'ul') {
					section.lines.push(`${indent}- `);
				} else {
					section.lines.push(`${indent + container.counter}. `);
					container.counter++;
				}
			} else if (isStrongTag(n)) {
				section.lines.push('**');
			} else if (isStrikeTag(n)) {
				section.lines.push('(');
			} else if (isInlineCodeTag(n)) {
				section.lines.push('`');
			} else if (n == 'q') {
				section.lines.push('"');
			} else if (n == 'img') {
				if (nodeAttributes.src) {
					// Many (most?) img tags don't have no source associated, especially when they were imported from HTML
					let s = '![';
					if (nodeAttributes.alt) s += tagAttributeToMdText(nodeAttributes.alt);
					s += `](${nodeAttributes.src})`;
					section.lines.push(s);
				}
			} else if (isAnchor(n)) {
				state.anchorAttributes.push(nodeAttributes);
				// Need to add the '[' via this function to make sure that links within code blocks
				// are handled correctly.
				collapseWhiteSpaceAndAppend(section.lines, state, '[');
			} else if (isEmTag(n)) {
				section.lines.push('*');
			} else if (n == 'en-todo') {
				let x = nodeAttributes && nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
				section.lines.push(`- [${x}] `);
			} else if (n == 'hr') {
				// Needs to be surrounded by new lines so that it's properly rendered as a line when converting to HTML
				section.lines.push(NEWLINE);
				section.lines.push('* * *');
				section.lines.push(NEWLINE);
				section.lines.push(NEWLINE);
			} else if (n == 'h1') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('# ');
			} else if (n == 'h2') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('## ');
			} else if (n == 'h3') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('### ');
			} else if (n == 'h4') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('#### ');
			} else if (n == 'h5') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('##### ');
			} else if (n == 'h6') {
				section.lines.push(BLOCK_OPEN);
				section.lines.push('###### ');
			} else if (n == 'blockquote') {
				section.lines.push(BLOCK_OPEN);
				state.inQuote = true;
			} else if (n === 'code') {
				state.inCode.push(true);
				state.currentCode = '';

				let newSection = {
					type: 'code',
					lines: [],
					parent: section,
				};

				section.lines.push(newSection);
				section = newSection;
			} else if (n === 'pre') {
				section.lines.push(BLOCK_OPEN);
				state.inPre = true;
			} else if (n == 'br') {
				section.lines.push(NEWLINE);
			} else if (n == 'en-media') {
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
						console.warn(`Hash with no associated resource: ${hash}`);
					}
				}

				// If the resource does not appear among the note's resources, it
				// means it's an attachement. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource && !!resource.id) {
					section.lines = addResourceTag(section.lines, resource, nodeAttributes.alt);
				}
			} else if (n == 'span') {
				if (isSpanWithStyle(nodeAttributes)) {
					// console.debug('Found style(s) in span tag: %s', nodeAttributes.style);
					state.spanAttributes.push(nodeAttributes);
					if (isSpanStyleBold(nodeAttributes)) {
						// console.debug('Applying style found in span tag: bold')
						section.lines.push('**');
					}
					if (isSpanStyleItalic(nodeAttributes)) {
						// console.debug('Applying style found in span tag: italic')
						section.lines.push('*');
					}
				}
			} else if (['font', 'sup', 'cite', 'abbr', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area'].indexOf(n) >= 0) {
				// Inline tags that can be ignored in Markdown
			} else {
				console.warn(`Unsupported start tag: ${n}`);
			}
		});

		saxStream.on('closetag', function(n) {
			n = n ? n.toLowerCase() : n;

			if (n == 'en-note') {
				// End of note
			} else if (isNewLineOnlyEndTag(n)) {
				section.lines.push(BLOCK_CLOSE);
			} else if (n == 'td' || n == 'th') {
				if (section && section.parent) section = section.parent;
			} else if (n == 'tr') {
				if (section && section.parent) section = section.parent;
			} else if (n == 'table') {
				if (section && section.parent) section = section.parent;
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else if (isListTag(n)) {
				section.lines.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (isStrongTag(n)) {
				section.lines.push('**');
			} else if (isStrikeTag(n)) {
				section.lines.push(')');
			} else if (isInlineCodeTag(n)) {
				section.lines.push('`');
			} else if (isEmTag(n)) {
				section.lines.push('*');
			} else if (n == 'q') {
				section.lines.push('"');
			} else if (n == 'blockquote') {
				section.lines.push(BLOCK_OPEN);
				state.inQuote = false;
			} else if (n === 'code') {
				state.inCode.pop();

				if (!state.inCode.length) {
					const codeLines = section.lines.join('').split('\n');
					section.lines = [];
					if (codeLines.length > 1) {
						for (let i = 0; i < codeLines.length; i++) {
							if (i > 0) section.lines.push('\n');
							section.lines.push(`\t${codeLines[i]}`);
						}
					} else {
						section.lines.push(`\`${codeLines.join('')}\``);
					}

					if (section && section.parent) section = section.parent;
				}
			} else if (n === 'pre') {
				state.inPre = false;
				section.lines.push(BLOCK_CLOSE);
			} else if (isAnchor(n)) {
				let attributes = state.anchorAttributes.pop();
				let url = attributes && attributes.href ? attributes.href : '';

				if (section.lines.length < 1) throw new Error('Invalid anchor tag closing'); // Sanity check, but normally not possible

				// When closing the anchor tag, check if there's is any text content. If not
				// put the URL as is (don't wrap it in [](url)). The markdown parser, using
				// GitHub flavour, will turn this URL into a link. This is to generate slightly
				// cleaner markdown.

				// Need to loop on the previous tags so as to skip the special ones, which are not relevant for the below algorithm.
				let previous = null;
				for (let i = section.lines.length - 1; i >= 0; i--) {
					previous = section.lines[i];
					if ([BLOCK_OPEN, BLOCK_CLOSE, NEWLINE, NEWLINE_MERGED, SPACE].indexOf(previous) >= 0 || !previous) {
						continue;
					} else {
						break;
					}
				}

				if (previous == '[') {
					// We have a link that had some content but, after parsing, nothing is left. The content was most likely
					// something that shows up via CSS and which we cannot support. For example:
					//
					// <a onclick="return vote()" href="vote?id=17045576">
					//    <div class="votearrow" title="upvote"></div>
					// </a>
					//
					// In the case above the arrow is displayed via CSS.
					// It is useless to display the full URL since often it is not relevant for a note (for example
					// it's interactive bits) and it's not user-generated content such as a URL that would appear in a comment.
					// So in this case, we still want to preserve the information but display it in a discreet way as a simple [L].

					// Need to pop everything inside the current [] because it can only be special chars that we don't want (they would create uncessary newlines)
					for (let i = section.lines.length - 1; i >= 0; i--) {
						if (section.lines[i] !== '[') {
							section.lines.pop();
						} else {
							break;
						}
					}

					if (!url) {
						// If there's no URL and no content, pop the [ and don't save any content.
						section.lines.pop();
					} else {
						section.lines.push('(L)');
						section.lines.push(`](${url})`);
					}
				} else if (!previous || previous == url) {
					section.lines.pop();
					section.lines.pop();
					section.lines.push(url);
				} else {
					// Need to remove any new line character between the current ']' and the previous '['
					// otherwise it won't render properly.
					let allSpaces = true;
					for (let i = section.lines.length - 1; i >= 0; i--) {
						const c = section.lines[i];
						if (c === '[') {
							break;
						} else {
							if (c === BLOCK_CLOSE || c === BLOCK_OPEN || c === NEWLINE) {
								section.lines[i] = SPACE;
							} else {
								if (!isWhiteSpace(c)) allSpaces = false;
							}
						}
					}

					if (allSpaces) {
						for (let i = section.lines.length - 1; i >= 0; i--) {
							const c = section.lines.pop();
							if (c === '[') break;
						}
						section.lines.push(url);
					} else {
						// Eg. converts:
						//     [ Sign in   ](https://example.com)
						// to:
						//     [Sign in](https://example.com)
						const trimTextStartAndEndSpaces = function(lines) {
							let firstBracketIndex = 0;
							let foundFirstNonWhite = false;
							for (let i = lines.length - 1; i >= 0; i--) {
								const l = lines[i];
								if (!foundFirstNonWhite && (l === SPACE || l === ' ' || !l)) {
									lines.pop();
								} else {
									foundFirstNonWhite = true;
								}

								if (l === '[') {
									firstBracketIndex = i;
									break;
								}
							}

							for (let i = firstBracketIndex + 1; i < lines.length; i++) {
								const l = lines[i];
								if (l === SPACE || l === ' ' || !l) {
									lines.splice(i, 1);
								} else {
									break;
								}
							}

							return lines;
						};

						section.lines = trimTextStartAndEndSpaces(section.lines);

						section.lines.push(`](${url})`);
					}
				}
			} else if (isListTag(n)) {
				section.lines.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (n == 'en-media') {
				// Skip
			} else if (n == 'span') {
				let attributes = state.spanAttributes.pop();
				if (isSpanWithStyle(attributes)) {
					if (isSpanStyleBold(attributes)) {
						// console.debug('Applying style found in span tag (closing): bold')
						section.lines.push('**');
					}
					if (isSpanStyleItalic(attributes)) {
						// console.debug('Applying style found in span tag (closing): italic')
						section.lines.push('*');
					}
				}
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else {
				console.warn(`Unsupported end tag: ${n}`);
			}
		});

		saxStream.on('attribute', function() {});

		saxStream.on('end', function() {
			resolve({
				content: section,
				resources: remainingResources,
			});
		});

		stream.pipe(saxStream);
	});
}

function tableHasSubTables(table) {
	for (let trIndex = 0; trIndex < table.lines.length; trIndex++) {
		const tr = table.lines[trIndex];
		if (!tr || !tr.lines) continue;

		for (let tdIndex = 0; tdIndex < tr.lines.length; tdIndex++) {
			const td = tr.lines[tdIndex];
			for (let i = 0; i < td.lines.length; i++) {
				if (typeof td.lines[i] === 'object') return true;
			}
		}
	}
	return false;
}

// Markdown tables don't support tables within tables, which is common in notes that are complete web pages, for example when imported
// via Web Clipper. So to handle this, we render all the outer tables as regular text (as if replacing all the <table>, <tr> and <td>
// elements by <div>) and only the inner ones, those that don't contain any other tables, are rendered as actual tables. This is generally
// the required behaviour since the outer tables are usually for layout and the inner ones are the content.
function drawTable(table) {
	// | First Header  | Second Header |
	// | ------------- | ------------- |
	// | Content Cell  | Content Cell  |
	// | Content Cell  | Content Cell  |

	// There must be at least 3 dashes separating each header cell.
	// https://gist.github.com/IanWang/28965e13cdafdef4e11dc91f578d160d#tables

	const flatRender = tableHasSubTables(table); // Render the table has regular text
	let lines = [];
	lines.push(BLOCK_OPEN);
	let headerDone = false;
	for (let trIndex = 0; trIndex < table.lines.length; trIndex++) {
		const tr = table.lines[trIndex];
		const isHeader = tr.isHeader;
		let line = [];
		let headerLine = [];
		let emptyHeader = null;
		for (let tdIndex = 0; tdIndex < tr.lines.length; tdIndex++) {
			const td = tr.lines[tdIndex];

			if (flatRender) {
				line.push(BLOCK_OPEN);

				let currentCells = [];

				const renderCurrentCells = () => {
					if (!currentCells.length) return;
					const cellText = processMdArrayNewLines(currentCells);
					line.push(cellText);
					currentCells = [];
				};

				// In here, recursively render the tables
				for (let i = 0; i < td.lines.length; i++) {
					const c = td.lines[i];
					if (typeof c === 'object' && ['table', 'td', 'tr', 'th'].indexOf(c.type) >= 0) {
						// This is a table
						renderCurrentCells();
						currentCells = currentCells.concat(drawTable(c));
					} else {
						// This is plain text
						currentCells.push(c);
					}
				}

				renderCurrentCells();

				line.push(BLOCK_CLOSE);
			} else {
				// Regular table rendering

				// A cell in a Markdown table cannot have actual new lines so replace
				// them with <br>, which are supported by the markdown renderers.
				let cellText = processMdArrayNewLines(td.lines, true);
				let lines = cellText.split('\n');
				lines = postProcessMarkdown(lines);
				cellText = lines.join('\n').replace(/\n+/g, '<br>');

				// Inside tables cells, "|" needs to be escaped
				cellText = cellText.replace(/\|/g, '\\|');

				// Previously the width of the cell was as big as the content since it looks nicer, however that often doesn't work
				// since the content can be very long, resulting in unreadable markdown. So no solution is perfect but making it a
				// width of 3 is a bit better. Note that 3 is the minimum width of a cell - below this, it won't be rendered by
				// markdown parsers.
				const width = 3;
				line.push(stringPadding(cellText, width, ' ', stringPadding.RIGHT));

				if (!headerDone) {
					if (!isHeader) {
						if (!emptyHeader) emptyHeader = [];
						let h = stringPadding(' ', width, ' ', stringPadding.RIGHT);
						emptyHeader.push(h);
					}
					headerLine.push('-'.repeat(width));
				}
			}
		}

		if (flatRender) {
			headerDone = true;
			lines.push(BLOCK_OPEN);
			lines = lines.concat(line);
			lines.push(BLOCK_CLOSE);
		} else {
			if (emptyHeader) {
				lines.push(`| ${emptyHeader.join(' | ')} |`);
				lines.push(`| ${headerLine.join(' | ')} |`);
				headerDone = true;
			}

			lines.push(`| ${line.join(' | ')} |`);

			if (!headerDone) {
				lines.push(`| ${headerLine.join(' | ')} |`);
				headerDone = true;
			}
		}
	}

	lines.push(BLOCK_CLOSE);

	return flatRender ? lines : lines.join(`<<<<:D>>>>${NEWLINE}<<<<:D>>>>`).split('<<<<:D>>>>');
}

function postProcessMarkdown(lines) {
	// After importing HTML, the resulting Markdown often has empty lines at the beginning and end due to
	// block start/end or elements that were ignored, etc. If these white spaces were intended it's not really
	// possible to detect it, so simply trim them all so that the result is more deterministic and can be
	// easily unit tested.
	const trimEmptyLines = function(lines) {
		while (lines.length) {
			if (!lines[0].trim()) {
				lines.splice(0, 1);
			} else {
				break;
			}
		}

		while (lines.length) {
			if (!lines[lines.length - 1].trim()) {
				lines.pop();
			} else {
				break;
			}
		}

		return lines;
	};

	function cleanUpSpaces(lines) {
		const output = [];

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];

			if (line.length) {
				// eg. "    -   Some list item" => "    - Some list item"
				// Note that spaces before the "-" are preserved
				line = line.replace(/^(\s+|)-\s+/, '$1- ');

				// eg "Some text     " => "Some text"
				line = line.replace(/^(.*?)\s+$/, '$1');
			}

			output.push(line);
		}

		return output;
	}

	lines = trimEmptyLines(lines);
	lines = cleanUpSpaces(lines);

	return lines;
}

async function enexXmlToMd(xmlString, resources, options = {}) {
	const stream = stringToStream(xmlString);
	let result = await enexXmlToMdArray(stream, resources, options);

	let mdLines = [];

	for (let i = 0; i < result.content.lines.length; i++) {
		let line = result.content.lines[i];
		if (typeof line === 'object' && line.type === 'table') {
			// A table
			const table = line;
			const tableLines = drawTable(table);
			mdLines = mdLines.concat(tableLines);
		} else if (typeof line === 'object' && line.type === 'code') {
			mdLines = mdLines.concat(line.lines);
		} else if (typeof line === 'object') {
			console.warn('Unhandled object type:', line);
			mdLines = mdLines.concat(line.lines);
		} else {
			// an actual line
			mdLines.push(line);
		}
	}

	let firstAttachment = true;
	for (let i = 0; i < result.resources.length; i++) {
		let r = result.resources[i];
		if (firstAttachment) mdLines.push(NEWLINE);
		mdLines.push(NEWLINE);
		mdLines = addResourceTag(mdLines, r, r.filename);
		firstAttachment = false;
	}

	let output = processMdArrayNewLines(mdLines).split('\n');

	output = postProcessMarkdown(output);

	return output.join('\n');
}

module.exports = { enexXmlToMd, processMdArrayNewLines, NEWLINE, addResourceTag };
