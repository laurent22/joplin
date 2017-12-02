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
	return n=="div" || n=="p" || n=="dl" || n=="dd" || n=="center";
}

function isStrongTag(n) {
	return n == "strong" || n == "b";
}

function isEmTag(n) {
	return n == "em" || n == "i" || n == "u";
}

function isAnchor(n) {
	return n == "a";
}

function isIgnoredEndTag(n) {
	return n=="en-note" || n=="en-todo" || n=="span" || n=="body" || n=="html" || n=="font" || n=="br" || n=='hr' || n=='s' || n == 'tbody' || n == 'sup';
}

function isListTag(n) {
	return n == "ol" || n == "ul";
}

// Elements that don't require any special treatment beside adding a newline character
function isNewLineOnlyEndTag(n) {
	return n=="div" || n=="p" || n=="li" || n=="h1" || n=="h2" || n=="h3" || n=="h4" || n=="h5" || n=="dl" || n=="dd" || n=="center";
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

function isNewLineBlock(s) {
	return s == BLOCK_OPEN || s == BLOCK_CLOSE;
}

function xmlNodeText(xmlNode) {
	if (!xmlNode || !xmlNode.length) return '';
	return xmlNode[0];
}

function enexXmlToMdArray(stream, resources) {
	resources = resources.slice();

	return new Promise((resolve, reject) => {
		let state = {
			inCode: false,
			inQuote: false,
			lists: [],
			anchorAttributes: [],
		};

		let options = {};
		let strict = true;
		var saxStream = require('sax').createStream(strict, options)

		let section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		saxStream.on('error', function(e) {
		  reject(e);
		})

		saxStream.on('text', function(text) {
			section.lines = collapseWhiteSpaceAndAppend(section.lines, state, text);
		})

		saxStream.on('opentag', function(node) {
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
			} else if (n == 'tbody') {
				// Ignore it
			} else if (n == 'tr') {
				if (section.type != 'table') throw new Error('Found a <tr> tag outside of a table');

				let newSection = {
					type: 'tr',
					lines: [],
					parent: section,
					isHeader: false,
				}

				section.lines.push(newSection);
				section = newSection;
			} else if (n == 'td' || n == 'th') {
				if (section.type != 'tr') throw new Error('Found a <td> tag outside of a <tr>');

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
			} else if (n == 's') {
				// Not supported
			} else if (n == 'q') {
				section.lines.push('"');
			} else if (isAnchor(n)) {
				state.anchorAttributes.push(node.attributes);
				section.lines.push('[');
			} else if (isEmTag(n)) {
				section.lines.push("*");
			} else if (n == "en-todo") {
				let x = node.attributes && node.attributes.checked && node.attributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
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
			} else if (isCodeTag(n, node.attributes)) {
				section.lines.push(BLOCK_OPEN);
				state.inCode = true;
			} else if (n == "br") {
				section.lines.push(NEWLINE);
			} else if (n == "en-media") {
				const hash = node.attributes.hash;

				let resource = null;
				for (let i = 0; i < resources.length; i++) {
					let r = resources[i];
					if (r.id == hash) {
						resource = r;
						resources.splice(i, 1);
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
					for (let i = 0; i < resources.length; i++) {
						let r = resources[i];
						if (!r.id) {
							r.id = hash;
							resources[i] = r;
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
						section.lines = addResourceTag(section.lines, resource, node.attributes.alt);
					}
				}
			} else if (n == "span" || n == "font" || n == 'sup') {
				// Ignore
			} else {
				console.warn("Unsupported start tag: " + n);
			}
		})

		saxStream.on('closetag', function(n) {
			if (n == 'en-note') {
				// End of note
			} else if (isNewLineOnlyEndTag(n)) {
				section.lines.push(BLOCK_CLOSE);
			} else if (n == 'td' || n == 'th') {
				section = section.parent;
			} else if (n == 'tr') {
				section = section.parent;
			} else if (n == 'table') {
				section = section.parent;
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else if (isListTag(n)) {
				section.lines.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (isStrongTag(n)) {
				section.lines.push("**");
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

				// When closing the anchor tag, check if there's is any text content. If not
				// put the URL as is (don't wrap it in [](url)). The markdown parser, using
				// GitHub flavour, will turn this URL into a link. This is to generate slightly
				// cleaner markdown.
				let previous = section.lines[section.lines.length - 1];
				if (previous == '[') {
					section.lines.pop();
					section.lines.push(url);
				} else if (!previous || previous == url) {
					section.lines.pop();
					section.lines.pop();
					section.lines.push(url);
				} else {
					section.lines.push('](' + url + ')');
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
				resources: resources,
			});
		})

		stream.pipe(saxStream);
	});
}

function setTableCellContent(table) {
	if (!table.type == 'table') throw new Error('Only for tables');

	for (let trIndex = 0; trIndex < table.lines.length; trIndex++) {
		const tr = table.lines[trIndex];
		for (let tdIndex = 0; tdIndex < tr.lines.length; tdIndex++) {
			let td = tr.lines[tdIndex];
			td.content = processMdArrayNewLines(td.lines);
			td.content = td.content.replace(/\n\n\n\n\n/g, ' ');
			td.content = td.content.replace(/\n\n\n\n/g, ' ');
			td.content = td.content.replace(/\n\n\n/g, ' ');
			td.content = td.content.replace(/\n\n/g, ' ');
			td.content = td.content.replace(/\n/g, ' ');
		}
	}

	return table;
}

function cellWidth(cellText) {
	const lines = cellText.split("\n");
	let maxWidth = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.length > maxWidth) maxWidth = line.length;
	}
	return maxWidth;
}

function colWidths(table) {
	let output = [];
	for (let trIndex = 0; trIndex < table.lines.length; trIndex++) {
		const tr = table.lines[trIndex];
		for (let tdIndex = 0; tdIndex < tr.lines.length; tdIndex++) {
			const td = tr.lines[tdIndex];
			const w = cellWidth(td.content);			
			if (output.length <= tdIndex) output.push(0);
			if (w > output[tdIndex]) output[tdIndex] = w;
		}
	}
	return output;
}

function drawTable(table, colWidths) {	
	// | First Header  | Second Header |
	// | ------------- | ------------- |
	// | Content Cell  | Content Cell  |
	// | Content Cell  | Content Cell  |

	// There must be at least 3 dashes separating each header cell.
	// https://gist.github.com/IanWang/28965e13cdafdef4e11dc91f578d160d#tables
	const minColWidth = 3;
	let lines = [];
	let headerDone = false;
	for (let trIndex = 0; trIndex < table.lines.length; trIndex++) {
		const tr = table.lines[trIndex];
		const isHeader = tr.isHeader;
		let line = [];
		let headerLine = [];
		let emptyHeader = null;
		for (let tdIndex = 0; tdIndex < colWidths.length; tdIndex++) {
			const width = Math.max(minColWidth, colWidths[tdIndex]);
			const cell = tr.lines[tdIndex] ? tr.lines[tdIndex].content : '';
			line.push(stringPadding(cell, width, ' ', stringPadding.RIGHT));

			if (!headerDone) {
				if (!isHeader) {
					if (!emptyHeader) emptyHeader = [];
					let h = stringPadding(' ', width, ' ', stringPadding.RIGHT);
					if (!width) h = '';
					emptyHeader.push(h);
				}
				headerLine.push('-'.repeat(width));
			}
		}

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

	return lines.join('<<<<:D>>>>' + NEWLINE + '<<<<:D>>>>').split('<<<<:D>>>>');
}

async function enexXmlToMd(stream, resources) {
	let result = await enexXmlToMdArray(stream, resources);

	let mdLines = [];

	for (let i = 0; i < result.content.lines.length; i++) {
		let line = result.content.lines[i];
		if (typeof line === 'object') { // A table
			let table = setTableCellContent(line);
			//console.log(require('util').inspect(table, false, null))
			const cw = colWidths(table);
			const tableLines = drawTable(table, cw);
			mdLines.push(BLOCK_OPEN);
			mdLines = mdLines.concat(tableLines);
			mdLines.push(BLOCK_CLOSE);
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