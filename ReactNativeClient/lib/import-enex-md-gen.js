const stringPadding = require('string-padding');
const stringToStream = require('string-to-stream')

const BLOCK_OPEN = "[[BLOCK_OPEN]]";
const BLOCK_CLOSE = "[[BLOCK_CLOSE]]";
const NEWLINE = "[[NEWLINE]]";
const NEWLINE_MERGED = "[[MERGED]]";
const SPACE = "[[SPACE]]";
// For monospace font detection (Courier, Menlo, Moncaco)
const MONOSPACE_OPEN = "[[MONOSPACE_OPEN]]";
const MONOSPACE_CLOSE = "[[MONOSPACE_CLOSE]]";

// This function will return a list of all monospace sections with a flag saying whether they can be merged or not
function findMonospaceSections(md) {
	let temp = [];

	let sections = [];
	let section = null;
	// This variable is used twice: to detected if a newline is between monospace sections and if a newline is inside monospace section
	let mergeWithPrevious = true;

	let last = "";
	for (let i = 0; i < md.length; i++) { 
		let v = md[i];
		
		if (v == MONOSPACE_OPEN) {
			if (section != null) throw new Error('Monospace open tag detected while the previous was not closed'); // Sanity check, but normally not possible

			let monospaceSection = {
				openIndex: null,
				closeIndex: null,
				mergeAllowed: true, 
				mergeWithPrevious: mergeWithPrevious,
				isEmptyLine: false,
			}
			section = monospaceSection;

			// Remember where monospace section begins, later it will be replaced with appropriate markdown (` or ```) 
			section.openIndex = temp.push(v) - 1;
			// Add an empty string, it can be later replaced with newline if necessary
			temp.push("");
			
			if (last != BLOCK_OPEN) {
				// We cannot merge inline code
				section.mergeAllowed = false;
			}

			// Reset to detect if monospace section contains a newline
			mergeWithPrevious = true;

		} else if (v == MONOSPACE_CLOSE) {
			if (section == null) throw new Error('Monospace tag was closed without being open before'); // Sanity check, but normally not possible
			if (section.closeIndex != null) throw new Error('Monospace tag is closed for the second time'); // Sanity check, but normally not possible

			// Add an empty string, it can be later replaced with newline if necessary
			temp.push("");
			// Remember where monospace section ends, later it will be replaced with appropriate markdown (` or ```) 
			section.closeIndex = temp.push(v) - 1;

			if (md[i+1] != BLOCK_CLOSE) {
				// We cannot merge inline code
				section.mergeAllowed = false;
			}

			section.isEmptyLine = mergeWithPrevious;
			sections.push(section);

			// Reset
			section = null;
			mergeWithPrevious = true;

		} else {
			// We can merge only if monospace sections are separated by newlines
			if (v != NEWLINE && v != BLOCK_OPEN && v != BLOCK_CLOSE) {
				mergeWithPrevious = false;
			}
			temp.push(v);
		}
		last = v;
	}

	return {
		md: temp,
		monospaceSections: sections,
	};
}

// This function is looping over monospace sections and merging what it can merge
function mergeMonospaceSections(md, sections) {

	const USE_BLOCK_TAG = 1;
	const USE_INLINE_TAG = 2;
	const USE_EMPTY_TAG = 3;

	const toMonospace = (md, section, startTag, endTag) => {

		// It looks better when empty lines are not inlined
		if (startTag == USE_INLINE_TAG && section.isEmptyLine) {
			startTag = USE_EMPTY_TAG;
			endTag = USE_EMPTY_TAG;
		}

		switch (startTag) {
			case USE_BLOCK_TAG:
				md[section.openIndex] = "```";
				md[section.openIndex + 1] = NEWLINE;
				break;
			case USE_INLINE_TAG:
				md[section.openIndex] = "`";
				break;
			case USE_EMPTY_TAG:
				md[section.openIndex] = "";
				break;
		}
		switch (endTag) {
			case USE_BLOCK_TAG:
				// We don't add a NEWLINE if there already is a NEWLINE
				if (md[section.closeIndex - 2] == NEWLINE) {
					md[section.closeIndex - 1] = "";
				} else {
					md[section.closeIndex - 1] = NEWLINE;
				}
				md[section.closeIndex] = "```";
				break;
			case USE_INLINE_TAG:
				md[section.closeIndex] = "`";
				break;
			case USE_EMPTY_TAG:
				md[section.closeIndex] = "";
				break;
		}
	}

	const getSection = () => {
		return sections.shift();
	}

	const getMergeableSection = (first = null) => {
		if (first) {
			sections.unshift(first);
		}
		while (sections.length) {
			s = sections.shift();
			if (s.mergeAllowed) {
				return s;
			}
			// If cannot merge then convert into inline code
			toMonospace(md, s, USE_INLINE_TAG, USE_INLINE_TAG);
		}
		return null;
	}

	let left = getMergeableSection();
	let right = null;

	while (left) {
		let isFirst = true;

		right = getSection();
		while (right && right.mergeAllowed && right.mergeWithPrevious) {
			// We can merge left and right
			if (isFirst) {
				isFirst = false;
				// First section
				toMonospace(md, left, USE_BLOCK_TAG, USE_EMPTY_TAG);
			} else {
				// Middle section
				toMonospace(md, left, USE_EMPTY_TAG, USE_EMPTY_TAG);
			}
			left = right;
			right = getSection();
		}

		if (isFirst) {
			// Could not merge, convert to inline code
			toMonospace(md, left, USE_INLINE_TAG, USE_INLINE_TAG);
		} else {
			// Was merged, add block end tag
			toMonospace(md, left, USE_EMPTY_TAG, USE_BLOCK_TAG);
		}

		left = getMergeableSection(right);
	}
}

// This function will try to merge monospace sections
// It works in two phases:
//   1) It will find all monospace sections
//   2) It will merge all monospace sections where merge is allowed
function mergeMonospaceSectionsWrapper(md, ignoreMonospace = false) {	

	if (!ignoreMonospace) {
		const result = findMonospaceSections(md);
		
		if (result.monospaceSections.length > 0) {
			mergeMonospaceSections(result.md, result.monospaceSections);
		}
		md = result.md;
	} 

	// Remove empty items, it is necessary for correct function of newline merging happening outside this function
	let temp = []
	for (let i = 0; i < md.length; i++) {
		let v = md[i];
		if (ignoreMonospace && (v == MONOSPACE_OPEN || v == MONOSPACE_CLOSE)) {
			continue; // skip
		}
		if (v != "") {
			temp.push(v);
		}
	} 

	return temp;		
}

function processMdArrayNewLines(md, isTable = false) {
	// console.info(md);

	// Try to merge MONOSPACE sections, works good when when not parsing a table
	// md = mergeMonospaceSectionsWrapper(md, isTable);

	while (md.length && md[0] == BLOCK_OPEN) {
		md.shift();
	}

	while (md.length && md[md.length - 1] == BLOCK_CLOSE) {
		md.pop();
	}

	let temp = [];
	let last = '';
	for (let i = 0; i < md.length; i++) { let v = md[i];
		if (isNewLineBlock(last) && isNewLineBlock(v) && last == v) {
			// Skip it
		} else {
			temp.push(v);
		}
		last = v;
	}
	md = temp;



	temp = [];
	last = "";
	for (let i = 0; i < md.length; i++) { let v = md[i];
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
	last = "";
	for (let i = 0; i < md.length; i++) { let v = md[i];
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
	last = "";
	for (let i = 0; i < md.length; i++) { let v = md[i];
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

	// console.info(md);

	let output = '';
	let previous = '';
	let start = true;
	for (let i = 0; i < md.length; i++) { let v = md[i];
		let add = '';
		if (v == BLOCK_CLOSE || v == BLOCK_OPEN || v == NEWLINE || v == NEWLINE_MERGED) {
			add = "\n";
		} else if (v == SPACE) {
			if (previous == SPACE || previous == "\n" || start) {
				continue; // skip
			} else {
				add = " ";
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
	}

	let lines = output.replace(/\\r/g, '').split('\n');

	// console.info(lines);

	lines = formatMdLayout(lines)
	// lines = convertSingleLineCodeBlocksToInline(lines)
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
	}

	const isListItem = function(line) {
		return line && line.trim().indexOf('- ') === 0;
	}

	const isCodeLine = function(line) {
		return line && line.indexOf('\t') === 0; 
	}

	const isTableLine = function(line) {
		return line.indexOf('| ') === 0;
	}

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
	}

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

function lineStartsWithDelimiter(line) {
	if (!line || !line.length) return false;
	return ' ,.;:)]}'.indexOf(line[0]) >= 0;
}

// function convertSingleLineCodeBlocksToInline(lines) {	
// 	let newLines = [];
// 	let currentCodeLines = [];
// 	let codeLineCount = 0;


// 	const processCurrentCodeLines = (line) => {
// 		if (codeLineCount === 1) {
// 			const inlineCode = currentCodeLines.join('').trim();
// 			newLines[newLines.length - 1] +=  '`' + inlineCode + '`';
// 			if (line) newLines[newLines.length - 1] += (lineStartsWithDelimiter(line) ? '' : ' ') + line;
// 		} else {
// 			newLines = newLines.concat(currentCodeLines);
// 			newLines.push(line);
// 		}

// 		currentCodeLines = [];
// 		codeLineCount = 0;
// 	}

// 	for (let i = 0; i < lines.length; i++) {
// 		const line = lines[i];

// 		if (isCodeLine(line)) {
// 			currentCodeLines.push(line);
// 			codeLineCount++;
// 		} else if (!line.trim()) {
// 			currentCodeLines.push(line);
// 		} else {
// 			if (currentCodeLines.length) {
// 				processCurrentCodeLines(line);
// 			} else {
// 				newLines.push(line);
// 			}
// 		}
// 	}

// 	if (currentCodeLines.length) processCurrentCodeLines('');

// 	return newLines;
// }

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
	// console.info([text]);

	if (state.inCode.length) {
		lines.push(text);

		// state.currentCode += text;


		// let previous = lines.length ? lines[lines.length - 1] : '';

		// // If the preceding item is a block limit, then the current line should start with a TAB
		// if ([BLOCK_OPEN, BLOCK_CLOSE, NEWLINE, NEWLINE_MERGED, MONOSPACE_OPEN, MONOSPACE_CLOSE].indexOf(previous) >= 0 || !previous) {
		// 	//text = "\t" + text;
		// 	lines.push('\t');
		// 	lines.push(text);
		// } else {
		// 	// If the current text contains one or more \n, then the last one should be immediately followed by a TAB
		// 	const idx = text.lastIndexOf('\n');
		// 	if (idx >= 0) {
		// 		text = text.substr(0, idx+1) + '\t' + text.substr(idx+1);
		// 	}

		// 	lines.push(text);
		// }
	} else {

		// console.info(lines);

		if (!!text.match(/^\n+$/)) {
			lines.push(' ');
			return lines;
		}

		// Remove all \n and \r from the left and right of the text
		while (text.length && (text[0] == "\n" || text[0] == "\r")) text = text.substr(1);
		while (text.length && (text[text.length - 1] == "\n" || text[text.length - 1] == "\r")) text = text.substr(0, text.length - 1);

		// Replace the inner \n with a space
		text = text.replace(/[\n\r]+/g, ' ');

		// Collapse all white spaces to just one. If there are spaces to the left and right of the string
		// also collapse them to just one space.
		let spaceLeft = text.length && text[0] == ' ';
		let spaceRight = text.length && text[text.length - 1] == ' ';
		text = simplifyString(text);

		if (!spaceLeft && !spaceRight && text == "") return lines;

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

const imageMimeTypes = ["image/cgm", "image/fits", "image/g3fax", "image/gif", "image/ief", "image/jp2", "image/jpeg", "image/jpm", "image/jpx", "image/naplps", "image/png", "image/prs.btif", "image/prs.pti", "image/t38", "image/tiff", "image/tiff-fx", "image/vnd.adobe.photoshop", "image/vnd.cns.inf2", "image/vnd.djvu", "image/vnd.dwg", "image/vnd.dxf", "image/vnd.fastbidsheet", "image/vnd.fpx", "image/vnd.fst", "image/vnd.fujixerox.edmics-mmr", "image/vnd.fujixerox.edmics-rlc", "image/vnd.globalgraphics.pgb", "image/vnd.microsoft.icon", "image/vnd.mix", "image/vnd.ms-modi", "image/vnd.net-fpx", "image/vnd.sealed.png", "image/vnd.sealedmedia.softseal.gif", "image/vnd.sealedmedia.softseal.jpg", "image/vnd.svf", "image/vnd.wap.wbmp", "image/vnd.xiff"];

function isImageMimeType(m) {
	return imageMimeTypes.indexOf(m) >= 0;
}

function addResourceTag(lines, resource, alt = "") {
	// TODO: refactor to use Resource.markdownTag

	let tagAlt = alt == "" ? resource.alt : alt;
	if (!tagAlt) tagAlt = '';
	if (isImageMimeType(resource.mime)) {
		lines.push("![");
		lines.push(tagAlt);
		lines.push("](:/" + resource.id + ")");
	} else {
		lines.push("[");
		lines.push(tagAlt);
		lines.push("](:/" + resource.id + ")");
	}

	return lines;
}


function isBlockTag(n) {
	return ["div", "p", "dl", "dd", 'dt', "center", 'address', 'form', 'input', 'section', 'nav', 'header', 'article', 'textarea', 'footer', 'fieldset', 'summary', 'details'].indexOf(n) >= 0;
}

function isStrongTag(n) {
	return n == "strong" || n == "b" || n == 'big';
}

function isStrikeTag(n) {
	return n == "strike" || n == "s" || n == 'del';
}

function isEmTag(n) {
	return n == "em" || n == "i" || n == "u";
}

function isAnchor(n) {
	return n == "a";
}

function isIgnoredEndTag(n) {
	return ["en-note", "en-todo", "span", "body", "html", "font", "br", 'hr', 'tbody', 'sup', 'img', 'abbr', 'cite', 'thead', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area', 'label', 'legend', 'time-ago', 'relative-time'].indexOf(n) >= 0;
}

function isListTag(n) {
	return n == "ol" || n == "ul";
}

// Elements that don't require any special treatment beside adding a newline character
function isNewLineOnlyEndTag(n) {
	return ["div", "p", "h1", "h2", "h3", "h4", "h5", 'h6', "dl", "dd", 'dt', "center", 'address', 'form', 'input', 'section', 'nav', 'header', 'article', 'textarea', 'footer', 'fieldset', 'summary', 'details'].indexOf(n) >= 0;
}

// Tags that must be ignored - both the tag and its content.
function isIgnoredContentTag(n) {
	return ['script', 'style', 'iframe', 'select', 'option', 'button', 'video', 'source', 'svg', 'path'].indexOf(n) >= 0
}

function isInlineCodeTag(n) {
	return ['samp', 'kbd'].indexOf(n) >= 0;
}

function isNewLineBlock(s) {
	return s == BLOCK_OPEN || s == BLOCK_CLOSE;
}

function xmlNodeText(xmlNode) {
	if (!xmlNode || !xmlNode.length) return '';
	return xmlNode[0];
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

function urlWithoutPath(url) {
	const parsed = require('url').parse(url, true);
	return parsed.protocol + '//' + parsed.host;
}

function urlProtocol(url) {
	const parsed = require('url').parse(url, true);
	return parsed.protocol;
}

const schemeRegex = /[a-zA-Z0-9\+\-\.]+:\/\//
// Make sure baseUrl doesn't end with a slash
function prependBaseUrl(url, baseUrl) {	
	if (!url) url = '';
	if (!baseUrl) return url;
	const matches = schemeRegex.exec(url);
	if (matches) return url; // Don't prepend the base URL if the URL already has a scheme

	if (url.length >= 2 && url.indexOf('//') === 0) { // If it starts with // it's a protcol-relative URL
		return urlProtocol(baseUrl) + url;
	} else if (url && url[0] === '/') { // If it starts with a slash, it's an absolute URL so it should be relative to the domain (and not to the full baseUrl)
		return urlWithoutPath(baseUrl) + url;
	} else {
		return baseUrl + '/' + url;
	}
}

function enexXmlToMdArray(stream, resources, options = {}) {
	if (options.baseUrl) options.baseUrl = options.baseUrl.replace(/[\/]+$/, '');

	let remainingResources = resources.slice();

	const removeRemainingResource = (id) => {
		for (let i = 0; i < remainingResources.length; i++) {
			const r = remainingResources[i];
			if (r.id === id) {
				remainingResources.splice(i, 1);
			}
		}
	}

	return new Promise((resolve, reject) => {
		let state = {
			inCode: [],
			inPre: false,
			inQuote: false,
			inMonospaceFont: false,
			inCodeblock: 0,
			lists: [],
			anchorAttributes: [],
			ignoreContents: [],
			ignoreWhiteSpace: [],
			warningsTags: [],
		};

		// In some cases white space should be ignored. For example, this:
		// <ul>
		//     <li>item</li>
		// <ul>
		// The whitespace between <ul> and <li> should not appear in the markdown document
		const ignoreWhiteSpace = () => {
			return state.ignoreWhiteSpace.length ? state.ignoreWhiteSpace[state.ignoreWhiteSpace.length-1] : false;
		}

		let saxStreamOptions = {};
		let strict = false;
		var saxStream = require('sax').createStream(strict, saxStreamOptions)

		let section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		saxStream.on('error', function(e) {
			console.warn(e);
		  //reject(e);
		})

		saxStream.on('text', function(text) {
			if (state.ignoreContents.length) return;
			if (['table', 'tr', 'tbody'].indexOf(section.type) >= 0) return;
			if ((!text || !text.trim()) && ignoreWhiteSpace()) return;
			section.lines = collapseWhiteSpaceAndAppend(section.lines, state, text);
		})

		saxStream.on('opentag', function(node) {
			const nodeAttributes = attributeToLowerCase(node);

			let n = node.name.toLowerCase();

			// if (n == "div") {
			// 	// div tags are recursive, in order to find the end we have to count the depth
			// 	if (state.inCodeblock > 0) {
			// 		state.inCodeblock++;
			// 	} else if (nodeAttributes && nodeAttributes.style && nodeAttributes.style.indexOf("box-sizing: border-box") >= 0) {
			// 		// Evernote code block start
			// 		state.inCodeblock = 1;
			// 		section.lines.push("```");
			// 		return; // skip further processing
			// 	}
			// }

			if (n == 'en-note') {
				// Start of note
			} else if (isBlockTag(n)) {
				section.lines.push(BLOCK_OPEN);
			} else if (isIgnoredContentTag(n)) {
				state.ignoreContents.push(true);
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
				}

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
				state.lists.push({ tag: n, counter: 1 });
				state.ignoreWhiteSpace.push(true);
			} else if (n == 'li') {
				state.ignoreWhiteSpace.push(false);
				section.lines.push(BLOCK_OPEN);
				if (!state.lists.length) {
					console.warn("Found <li> tag without being inside a list");
					return;
				}

				let container = state.lists[state.lists.length - 1];
				if (container.tag == "ul") {
					section.lines.push("- ");
				} else {
					section.lines.push(container.counter + '. ');
					container.counter++;
				}
			} else if (isStrongTag(n)) {
				section.lines.push("**");
			} else if (isStrikeTag(n)) {
				section.lines.push('(');
			} else if (isInlineCodeTag(n)) {
				section.lines.push('`');
			} else if (n == 'q') {
				section.lines.push('"');
			} else if (n == 'img') {
				if (nodeAttributes.src) { // Many (most?) img tags don't have no source associated, especially when they were imported from HTML
					let s = '![';
					if (nodeAttributes.alt) s += nodeAttributes.alt;
					s += '](' + prependBaseUrl(nodeAttributes.src, options.baseUrl) + ')';
					section.lines.push(s);
				}
			} else if (isAnchor(n)) {
				state.anchorAttributes.push(nodeAttributes);
				// Need to add the '[' via this function to make sure that links within code blocks
				// are handled correctly.
				collapseWhiteSpaceAndAppend(section.lines, state, '[');
			} else if (isEmTag(n)) {
				section.lines.push("*");
			} else if (n == "en-todo") {
				let x = nodeAttributes && nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
				section.lines.push('- [' + x + '] ');
			} else if (n == "hr") {
				// Needs to be surrounded by new lines so that it's properly rendered as a line when converting to HTML
				section.lines.push(NEWLINE);
				section.lines.push('* * *');
				section.lines.push(NEWLINE);
				section.lines.push(NEWLINE);
			} else if (n == "h1") {
				section.lines.push(BLOCK_OPEN); section.lines.push("# ");
			} else if (n == "h2") {
				section.lines.push(BLOCK_OPEN); section.lines.push("## ");
			} else if (n == "h3") {
				section.lines.push(BLOCK_OPEN); section.lines.push("### ");
			} else if (n == "h4") {
				section.lines.push(BLOCK_OPEN); section.lines.push("#### ");
			} else if (n == "h5") {
				section.lines.push(BLOCK_OPEN); section.lines.push("##### ");
			} else if (n == "h6") {
				section.lines.push(BLOCK_OPEN); section.lines.push("###### ");
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
				}

				section.lines.push(newSection);
				section = newSection;
			} else if (n === 'pre') {
				section.lines.push(BLOCK_OPEN);
				state.inPre = true;
			} else if (n == "br") {
				section.lines.push(NEWLINE);
			} else if (n == "en-media") {
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
				}
		 	// } else if (n == "span" || n == "font") {
				// // Check for monospace font. It can come from being specified in either from
				// // <span style="..."> or <font face="...">.
				// // Monospace sections are already in monospace for Evernote code blocks
				// if (state.inCodeblock == 0 && nodeAttributes) {
				// 	let style = null;

				// 	if (nodeAttributes.style) {
				// 		style = nodeAttributes.style.toLowerCase();
				// 	} else if (nodeAttributes.face) {
				// 		style = nodeAttributes.face.toLowerCase();
				// 	}
				
				// 	monospace = style ? style.match(/monospace|courier|menlo|monaco/) != null : false;

				// 	if (monospace) {
				// 		state.inMonospaceFont = true;
				// 		section.lines.push(MONOSPACE_OPEN);
				// 	}
				// } 
			} else if (["span", "font", 'sup', 'cite', 'abbr', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area', 'label', 'legend', 'time-ago', 'relative-time'].indexOf(n) >= 0) {
				// Inline tags that can be ignored in Markdown
			} else {
				if (state.warningsTags.indexOf(n) < 0) {
					console.warn("Unsupported start tag: " + n);
					state.warningsTags.push(n);
				}
			}
		})

		saxStream.on('closetag', function(n) {
			n = n ? n.toLowerCase() : n;

			// if (n == "div") {
			// 	if (state.inCodeblock >= 1) {
			// 		state.inCodeblock--;
			// 		if (state.inCodeblock == 0) {
			// 			// Evernote code block end
			// 			section.lines.push("```");
			// 			return; // skip further processing
			// 		}
			// 	}
			// }

			if (n == 'en-note') {
				// End of note
			} else if (isNewLineOnlyEndTag(n)) {
				section.lines.push(BLOCK_CLOSE);
			} else if (isIgnoredContentTag(n)) {
				state.ignoreContents.pop();
			} else if (n == 'td' || n == 'th') {
				if (section && section.parent) section = section.parent;
			} else if (n == 'tr') {
				if (section && section.parent) section = section.parent;
			} else if (n == 'table') {
				if (section && section.parent) section = section.parent;
			// } else if (n == "span" || n == "font") {
			// 	if (state.inCodeblock == 0 && state.inMonospaceFont) {
			// 		state.inMonospaceFont = false;
			// 		section.lines.push(MONOSPACE_CLOSE);
			// 	}
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else if (isListTag(n)) {
				state.ignoreWhiteSpace.pop();
				section.lines.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (n === 'li') {
				state.ignoreWhiteSpace.pop();

				// Once the LI tag is closed, go back to tokens that were added and remove and newline or block delimiter
				// since the LI needs to be one line only to work.
				for (let i = section.lines.length - 1; i >= 0; i--) {
					const line = section.lines[i];
					if ([BLOCK_OPEN, BLOCK_CLOSE, NEWLINE, NEWLINE_MERGED, SPACE].indexOf(line) >= 0 || !line) {
						section.lines[i] = ' ';
					} else if (line === '- ') {
						break;
					}
				}

				section.lines.push(BLOCK_CLOSE);
			} else if (isStrongTag(n)) {
				section.lines.push("**");
			} else if (isStrikeTag(n)) {
				section.lines.push(')');
			} else if (isInlineCodeTag(n)) {
				section.lines.push('`');
			} else if (isEmTag(n)) {
				section.lines.push("*");
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
							section.lines.push('\t' + codeLines[i]);
						}
					} else {
						section.lines.push('`' + codeLines.join('') + '`');
					}

					if (section && section.parent) section = section.parent;
				}
			} else if (n === 'pre') {
				state.inPre = false;
				section.lines.push(BLOCK_CLOSE);
			} else if (isAnchor(n)) {
				let attributes = state.anchorAttributes.pop();
				let url = attributes && attributes.href ? attributes.href : '';
				url = prependBaseUrl(url, options.baseUrl);

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
						section.lines.push('](' + url + ')');
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
								if (l === SPACE || l === ' ' ||!l) {
									lines.splice(i, 1);
								} else {
									break;
								}
							}

							return lines;
						}

						section.lines = trimTextStartAndEndSpaces(section.lines);

						section.lines.push('](' + url + ')');
					}
				}
			} else if (isListTag(n)) {
				section.lines.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (n == "en-media") {
				// Skip
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else {
				if (state.warningsTags.indexOf(n) < 0) {
					console.warn("Unsupported end tag: " + n);
					state.warningsTags.push(n);
				}
			}
		})

		saxStream.on('attribute', function(attr) {
			
		})

		saxStream.on('end', function() {
			resolve({
				content: section,
				resources: remainingResources,
			});
		})

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
					const cellText = processMdArrayNewLines(currentCells, true);
					line.push(cellText);
					currentCells = [];
				}

				// In here, recursively render the tables
				for (let i = 0; i < td.lines.length; i++) {
					const c = td.lines[i];
					if (typeof c === 'object') { // This is a table
						renderCurrentCells();
						currentCells = currentCells.concat(drawTable(c));
					} else { // This is plain text
						currentCells.push(c);
					}
				}

				renderCurrentCells();

				line.push(BLOCK_CLOSE);
			} else { // Regular table rendering

				// A cell in a Markdown table cannot have actual new lines so replace
				// them with <br>, which are supported by the markdown renderers.
				let cellText = processMdArrayNewLines(td.lines, true)
				let lines = cellText.split('\n');
				lines = postProcessMarkdown(lines);
				cellText = lines.join('\n').replace(/\n+/g, "<br>");

				// Inside tables cells, "|" needs to be escaped
				cellText = cellText.replace(/\|/g, "\\|");

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
				lines.push('| ' + emptyHeader.join(' | ') + ' |');
				lines.push('| ' + headerLine.join(' | ') + ' |');
				headerDone = true;
			}

			lines.push('| ' + line.join(' | ') + ' |');

			if (!headerDone) {
				lines.push('| ' + headerLine.join(' | ') + ' |');
				headerDone = true;
			}
		}
	}

	lines.push(BLOCK_CLOSE);

	return flatRender ? lines : lines.join('<<<<:D>>>>' + NEWLINE + '<<<<:D>>>>').split('<<<<:D>>>>');
}

// function minifyHtml(html) {
// 	let output = require('html-minifier').minify(html, {
// 		removeComments: true,
// 		collapseInlineTagWhitespace: true,
// 		collapseWhitespace: true,
// 		conservativeCollapse: true,
// 		preserveLineBreaks: true,
// 	});

// 	const endsWithInlineTag = function(line) {
// 		return !!line.match(/\/(span|b|i|strong|em)>$/);
// 	}

// 	let lines = output.split('\n');
// 	for (let i = lines.length - 1; i >= 1; i--) {
// 		const line = lines[i];
// 		const previous = lines[i-1];

// 		if (!line) continue;

// 		if (line[0] !== ' ' && endsWithInlineTag(previous)) {
// 			lines.splice(i, 1);
// 			lines[i-1] = previous + ' ' + line;
// 		}
// 	}

// 	output = lines.join('\n');

// 	return output;
// }

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
	}

	function cleanUpSpaces(lines) {
		const output = [];

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];

			if (line.length) {
				// eg. "    -   Some list item" => "    - Some list item"
				// Note that spaces before the "-" are preserved
				line = line.replace(/^(\s+|)-\s+/, '$1- ')

				// eg "Some text     " => "Some text"
				line = line.replace(/^(.*?)\s+$/, '$1')

				// if (line.length && line[0] !== '\t' && line[0] !== '|') {
				// 	const tokens = line.split('`');
				// 	for (let i = 0; i < tokens.length; i += 2) {
				// 		let token = tokens[i];
				// 		token = token.replace(/\s+/g, ' ');
				// 		tokens[i] = token;
				// 	}
				// 	line = tokens.join('`');
				// }
			}

			output.push(line);
		}

		return output;
	}

	lines = trimEmptyLines(lines)
	lines = cleanUpSpaces(lines)

	return lines;
}

async function enexXmlToMd(xmlString, resources, options = {}) {
	// This allows simplifying the HTML, which results in better Markdown. In particular, it removes all
	// non-significant newlines and convert them to spaces.
	// xmlString = minifyHtml(xmlString);
	// console.info([xmlString]);

	const stream = stringToStream(xmlString);
	let result = await enexXmlToMdArray(stream, resources, options);

	let mdLines = [];

	for (let i = 0; i < result.content.lines.length; i++) {
		let line = result.content.lines[i];
		if (typeof line === 'object' && line.type === 'table') { // A table
			const table = line;
			const tableLines = drawTable(table);
			mdLines = mdLines.concat(tableLines);
		} else if (typeof line === 'object' && line.type === 'code') {
			mdLines = mdLines.concat(line.lines);
		} else if (typeof line === 'object') {
			console.warn('Unhandled object type:', line);
			mdLines = mdLines.concat(line.lines);
		} else { // an actual line
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

	let output = processMdArrayNewLines(mdLines).split('\n')

	output = postProcessMarkdown(output);

	return output.join('\n');
}

module.exports = { enexXmlToMd, processMdArrayNewLines, NEWLINE, addResourceTag };