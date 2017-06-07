require('app-module-path').addPath(__dirname);

import { uuid } from 'src/uuid.js';
import moment from 'moment';


const Promise = require('promise');
const fs = require('fs');
const xml2js = require("xml2js");

const BLOCK_OPEN = "<div>";
const BLOCK_CLOSE = "</div>";
const NEWLINE = "<br/>";
const NEWLINE_MERGED = "<merged/>";
const SPACE = "<space/>";

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
		if (text === undefined) console.info('AAAAAAAAAA');
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

		if (spaceLeft) lines.push(SPACE);
		if (text === undefined) console.info('BBBBBBB');
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
	let tagAlt = alt == "" ? resource.alt : alt;
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


function enexXmlToMd(stream) {
	return new Promise((resolve, reject) => {
		let output = [];
		let state = {
			inCode: false,
			lists: [],
			anchorAttributes: [],
		};

		let options = {};
		let strict = true;
		var saxStream = require('sax').createStream(strict, options)

		saxStream.on('error', function(e) {
		  reject(e);
		})

		saxStream.on('text', function(text) {
			output = collapseWhiteSpaceAndAppend(output, state, text);
		})

		saxStream.on('opentag', function(node) {
			let n = node.name.toLowerCase();
			if (n == 'en-note') {
				// Start of note
			} else if (isBlockTag(n)) {
				output.push(BLOCK_OPEN);
			} else if (isListTag(n)) {
				output.push(BLOCK_OPEN);
				state.lists.push({ tag: n, counter: 1 });
			} else if (n == 'li') {
				output.push(BLOCK_OPEN);
				if (!state.lists.length) {
					reject("Found <li> tag without being inside a list"); // TODO: could be a warning, but nothing to handle warnings at the moment
					return;
				}

				let container = state.lists[state.lists.length - 1];
				if (container.tag == "ul") {
					output.push("- ");
				} else {
					output.push(container.counter + '. ');
					container.counter++;
				}
			} else if (isStrongTag(n)) {
				output.push("**");
			} else if (isAnchor(n)) {
				state.anchorAttributes.push(node.attributes);
				output.push('[');
			} else if (isEmTag(n)) {
				output.push("*");
			} else if (n == "en-todo") {
				let x = node.attributes && node.attributes.checked.toLowerCase() == 'true' ? 'X' : ' ';
				output.push('- [' + x + '] ');
			} else if (n == "h1") {
				output.push(BLOCK_OPEN); output.push("# ");
			} else if (n == "h2") {
				output.push(BLOCK_OPEN); output.push("## ");
			} else if (n == "h3") {
				output.push(BLOCK_OPEN); output.push("### ");
			} else if (n == "h4") {
				output.push(BLOCK_OPEN); output.push("#### ");
			} else if (n == "h5") {
				output.push(BLOCK_OPEN); output.push("##### ");
			} else if (n == "h6") {
				output.push(BLOCK_OPEN); output.push("###### ");
			} else if (isCodeTag(n)) {
				output.push(BLOCK_OPEN);
				state.inCode = true;
			} else if (n == "br") {
				output.push(NEWLINE);
			} else if (n == "en-media") {
				console.warn('TODO: en-media');
				// attrs = attributesLIFO.back();
				// QString hash = attrs["hash"];
				// Resource resource;
				// for (int i = 0; i < state.resources.size(); i++) {
				// 	Resource r = state.resources[i];
				// 	if (r.id == hash) {
				// 		resource = r;
				// 		state.resources.erase(state.resources.begin() + i);
				// 		break;
				// 	}
				// }

				// // If the resource does not appear among the note's resources, it
				// // means it's an attachement. It will be appended along with the
				// // other remaining resources at the bottom of the markdown text.
				// if (resource.id != "") {
				// 	addResourceTag(lines, resource, attrs["alt"]);
				// }
			} else if (n == "span" || n == "font") {
				// Ignore
			} else {
				reject("Unsupported start tag:" + n); // TODO: should be a warning
			}
		})

		saxStream.on('closetag', function(n) {
			if (n == 'en-note') {
				// End of note
			} else if (isNewLineOnlyEndTag(n)) {
				output.push(BLOCK_CLOSE);
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else if (isListTag(n)) {
				output.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (isStrongTag(n)) {
				output.push("**");
			} else if (isEmTag(n)) {
				output.push("*");
			} else if (isCodeTag(n)) {
				state.inCode = false;
				output.push(BLOCK_CLOSE);
			} else if (isAnchor(n)) {
				let attributes = state.anchorAttributes.pop();
				let url = attributes && attributes.href ? attributes.href : '';
				output.push('](' + url + ')');
			} else if (isListTag(n)) {
				output.push(BLOCK_CLOSE);
				state.lists.pop();
			} else if (n == "en-media") {
				// Skip
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else {
				reject("Unsupported end tag:" + n); // TODO: should be a warning
			}

		})

		saxStream.on('attribute', function(attr) {
			
		})

		saxStream.on('end', function() {
			resolve(output);
		})

		stream.pipe(saxStream);
	});
}



const path = require('path');

var walk = function (dir, done) {
	fs.readdir(dir, function (error, list) {
		if (error) return done(error);
		var i = 0;
		(function next () {
			var file = list[i++];

			if (!file) return done(null);            
			file = dir + '/' + file;
			
			fs.stat(file, function (error, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function (error) {
						next();
					});
				} else {
					if (path.basename(file) != 'sample4.xml') {
						next();
						return;
					}

					if (path.extname(file) == '.xml') {
						console.info('Processing: ' + file);
						let stream = fs.createReadStream(file);
						enexXmlToMd(stream).then((md) => {
							console.info(md);
							console.info(processMdArrayNewLines(md));
							next();
						}).catch((error) => {
							console.error(error);
							return done(error);
						});
					} else {
						next();
					}
				}
			});
		})();
	});
};

walk('/home/laurent/Dropbox/Samples/', function(error) {
	if (error) {
		throw error;
	} else {
		console.log('-------------------------------------------------------------');
		console.log('finished.');
		console.log('-------------------------------------------------------------');
	}
});



function parseXml(xml) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(xml, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function readFile(path, options = null) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, options, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function isBlockTag(n) {
	return n=="div" || n=="p" || n=="dl" || n=="dd" || n=="center" || n=="table" || n=="tr" || n=="td" || n=="th" || n=="tbody";
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
	return n=="en-note" || n=="en-todo" || n=="span" || n=="body" || n=="html" || n=="font" || n=="br";
}

function isListTag(n) {
	return n == "ol" || n == "ul";
}

// Elements that don't require any special treatment beside adding a newline character
function isNewLineOnlyEndTag(n) {
	return n=="div" || n=="p" || n=="li" || n=="h1" || n=="h2" || n=="h3" || n=="h4" || n=="h5" || n=="dl" || n=="dd" || n=="center" || n=="table" || n=="tr" || n=="td" || n=="th" || n=="tbody";
}

function isCodeTag(n) {
	return n == "pre" || n == "code";
}

function isNewLineBlock(s) {
	return s == BLOCK_OPEN || s == BLOCK_CLOSE;
}

function xmlNodeText(xmlNode) {
	if (!xmlNode || !xmlNode.length) return '';
	return xmlNode[0];
}

function dateToTimestamp(s) {
	let m = moment(s, 'YYYYMMDDTHHmmssZ');
	if (!m.isValid()) {
		throw new Error('Invalid date: ' + s);
	}
	return Math.round(m.toDate().getTime() / 1000);
}

function evernoteXmlToMdArray(xml) {
	return parseXml(xml).then((xml) => {
		console.info(xml);
	});
}

function toApiNote(xml) {
	let o = {};

	o.id = uuid.create();
	o.title = xmlNodeText(xml.title);

	// o.body = '';
	// if (xml.content && xml.content.length) {
	// 	o.body = xmlToMd(xml.content[0]);
	// }

	o.created_time = dateToTimestamp(xml.created);
	o.updated_time = dateToTimestamp(xml.updated);

	if (xml['note-attributes'] && xml['note-attributes'].length) {
		let attributes = xml['note-attributes'][0];
		o.latitude = xmlNodeText(attributes.latitude);
		o.longitude = xmlNodeText(attributes.longitude);
		o.altitude = xmlNodeText(attributes.altitude);
		o.author = xmlNodeText(attributes.author);
	}

	o.tags = [];
	if (xml.tag && xml.tag.length) o.tags = xml.tag;

	return o;
}




// readFile('sample.enex', 'utf8').then((content) => {
// 	return parseXml(content);
// }).then((doc) => {
// 	let notes = doc['en-export']['note'];
// 	for (let i = 0; i < notes.length; i++) {
// 		let note = notes[i];
// 		let apiNote = toApiNote(note);
// 	}
// }).catch((error) => {
// 	console.error('Error reading XML file', error);
// });








// import { WebApi } from 'src/web-api.js'

// let api = new WebApi('http://joplin.local');

// api.post('sessions', null, {
// 	email: 'laurent@cozic.net',
// 	password: '12345678',
// }).then((session) => {
// 	console.info(session);
// });