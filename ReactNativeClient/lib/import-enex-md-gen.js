const stringPadding = require('string-padding');

const BLOCK_OPEN = "[[BLOCK_OPEN]]";
const BLOCK_CLOSE = "[[BLOCK_CLOSE]]";
const NEWLINE = "[[NEWLINE]]";
const NEWLINE_MERGED = "[[MERGED]]";
const SPACE = "[[SPACE]]";

function processMdArrayNewLines(md) {
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

	return output;
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
	if (state.inCode) {
		text = "\t" + text;
		lines.push(text);
	} else {
		// Remove all \n and \r from the left and right of the text
		while (text.length && (text[0] == "\n" || text[0] == "\r")) text = text.substr(1);
		while (text.length && (text[text.length - 1] == "\n" || text[text.length - 1] == "\r")) text = text.substr(0, text.length - 1);

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
	return ["div", "p", "dl", "dd", 'dt', "center", 'address'].indexOf(n) >= 0;
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
	return ["en-note", "en-todo", "span", "body", "html", "font", "br", 'hr', 'tbody', 'sup', 'img', 'abbr', 'cite', 'thead', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area'].indexOf(n) >= 0;
}

function isListTag(n) {
	return n == "ol" || n == "ul";
}

// Elements that don't require any special treatment beside adding a newline character
function isNewLineOnlyEndTag(n) {
	return ["div", "p", "li", "h1", "h2", "h3", "h4", "h5", 'h6', "dl", "dd", 'dt', "center", 'address'].indexOf(n) >= 0;
}

function isCodeTag(n) {
	// NOTE: This handles "code" tags that were copied and pasted from a browser to Evernote. Evernote also has its own code block, which
	// of course is way more complicated and currently not fully supported (the code will be imported and indented properly, but it won't
	// have the extra Markdown indentation that identifies the block as code). For reference this is an example of Evernote-style code block:
	//
	// <div style="-en-codeblock: true; box-sizing: border-box; padding: 8px; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;,
	// monospace; font-size: 12px; color: rgb(51, 51, 51); border-top-left-radius: 4px; border-top-right-radius: 4px; border-bottom-right-radius:
	// 4px; border-bottom-left-radius: 4px; background-color: rgb(251, 250, 248); border: 1px solid rgba(0, 0, 0, 0.14902); background-position:
	// initial initial; background-repeat: initial initial;"><div>function justTesting() {</div><div>&nbsp; &nbsp; &nbsp;someCodeBlock();</div>
	// <div>&nbsp; &nbsp; &nbsp;return true;</div><div>}</div></div>
	//
	// Which in normal HTML would be:
	//
	// <code>
	// function justTesting() {
	//    someCodeBlock();
	//    return true;
	// }
	// <code>
	return n == "pre" || n == "code";
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

function enexXmlToMdArray(stream, resources) {
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
			inCode: false,
			inQuote: false,
			lists: [],
			anchorAttributes: [],
		};

		let options = {};
		let strict = false;
		var saxStream = require('sax').createStream(strict, options)

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
			if (['table', 'tr', 'tbody'].indexOf(section.type) >= 0) return;
			section.lines = collapseWhiteSpaceAndAppend(section.lines, state, text);
		})

		saxStream.on('opentag', function(node) {
			const nodeAttributes = attributeToLowerCase(node);

			let n = node.name.toLowerCase();
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
			} else if (n == 'li') {
				section.lines.push(BLOCK_OPEN);
				if (!state.lists.length) {
					reject("Found <li> tag without being inside a list"); // TODO: could be a warning, but nothing to handle warnings at the moment
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
				// TODO: TEST IMAGE
				if (nodeAttributes.src) { // Many (most?) img tags don't have no source associated, especially when they were imported from HTML
					let s = '![';
					if (nodeAttributes.alt) s += nodeAttributes.alt;
					s += '](' + nodeAttributes.src + ')';
					section.lines.push(s);
				}
			} else if (isAnchor(n)) {
				state.anchorAttributes.push(nodeAttributes);
				section.lines.push('[');
			} else if (isEmTag(n)) {
				section.lines.push("*");
			} else if (n == "en-todo") {
				let x = nodeAttributes && nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
				section.lines.push('- [' + x + '] ');
			} else if (n == "hr") {
				// Needs to be surrounded by new lines so that it's properly rendered as a line when converting to HTML
				section.lines.push(NEWLINE);
				section.lines.push('----------------------------------------');
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
			} else if (isCodeTag(n, nodeAttributes)) {
				section.lines.push(BLOCK_OPEN);
				state.inCode = true;
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

					let found = false;
					for (let i = 0; i < remainingResources.length; i++) {
						let r = remainingResources[i];
						if (!r.id) {
							r.id = hash;
							remainingResources[i] = r;
							found = true;
							break;
						}
					}

					if (!found) {
						console.warn('Hash with no associated resource: ' + hash);
					}
				} else {
					// If the resource does not appear among the note's resources, it
					// means it's an attachement. It will be appended along with the
					// other remaining resources at the bottom of the markdown text.
					if (!!resource.id) {
						section.lines = addResourceTag(section.lines, resource, nodeAttributes.alt);
					}
				}
			} else if (["span", "font", 'sup', 'cite', 'abbr', 'small', 'tt', 'sub', 'colgroup', 'col', 'ins', 'caption', 'var', 'map', 'area'].indexOf(n) >= 0) {
				// Inline tags that can be ignored in Markdown
			} else {
				console.warn("Unsupported start tag: " + n);
			}
		})

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
			} else if (isCodeTag(n)) {
				state.inCode = false;
				section.lines.push(BLOCK_CLOSE);
			} else if (isAnchor(n)) {
				let attributes = state.anchorAttributes.pop();
				let url = attributes && attributes.href ? attributes.href : '';

				if (section.lines.length < 1) throw new Error('Invalid anchor tag closing'); // Sanity check, but normally not possible

				const pushEmptyAnchor = (url) => {
					section.lines.push('[link](' + url + ')');
				}

				// When closing the anchor tag, check if there's is any text content. If not
				// put the URL as is (don't wrap it in [](url)). The markdown parser, using
				// GitHub flavour, will turn this URL into a link. This is to generate slightly
				// cleaner markdown.
				let previous = section.lines[section.lines.length - 1];
				if (previous == '[') {
					section.lines.pop();
					pushEmptyAnchor(url);
				} else if (!previous || previous == url) {
					section.lines.pop();
					section.lines.pop();
					pushEmptyAnchor(url);
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
						//section.lines.push(url);
						pushEmptyAnchor(url);
					} else {
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
				console.warn("Unsupported end tag: " + n);
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
	const minColWidth = 3;
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
				const cellText = processMdArrayNewLines(td.lines).replace(/\n+/g, "<br>");

				const width = Math.max(cellText.length, 3);
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

async function enexXmlToMd(stream, resources) {
	let result = await enexXmlToMdArray(stream, resources);

	let mdLines = [];

	for (let i = 0; i < result.content.lines.length; i++) {
		let line = result.content.lines[i];
		if (typeof line === 'object') { // A table
			const table = line;
			const tableLines = drawTable(table);
			mdLines = mdLines.concat(tableLines);
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

	return processMdArrayNewLines(mdLines);
}

module.exports = { enexXmlToMd, processMdArrayNewLines, NEWLINE, addResourceTag };