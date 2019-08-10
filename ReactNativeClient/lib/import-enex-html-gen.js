const stringToStream = require('string-to-stream');
const cleanHtml = require('clean-html');
const resourceUtils = require('lib/resourceUtils.js');

function addResourceTag(lines, resource, attributes) {
	// Note: refactor to use Resource.markdownTag
	if (!attributes.alt) attributes.alt = resource.title;
	if (!attributes.alt) attributes.alt = resource.filename;
	if (!attributes.alt) attributes.alt = '';

	const src = `:/${resource.id}`;

	if (resourceUtils.isImageMimeType(resource.mime)) {
		lines.push(resourceUtils.imgElement({src, attributes}));
	} else if (resource.mime === 'audio/x-m4a') {
		/**
		 * TODO: once https://github.com/laurent22/joplin/issues/1794 is resolved,
		 * come back to this and make sure it works.
		 */
		lines.push(resourceUtils.audioElement({src, id: resource.id}));
	} else {
		// TODO: figure out if we need to handle other mime types
		console.warn('mime type not recognized:', resource.mime);
		lines.push(`[${attributes.alt}](${src})`);
	}

	return lines;
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
		const options = {};
		const strict = false;
		var saxStream = require('sax').createStream(strict, options);

		let section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		saxStream.on('error', function(e) {
			console.warn(e);
			// reject(e);
		});


		saxStream.on('text', function(text) {
			section.lines.push(text);
		});

		saxStream.on('opentag', function(node) {
			const tagName = node.name.toLowerCase();
			const attributesStr =
				Object.entries(node.attributes)
					.map(([key, value]) => ` ${key}="${value.replace(/"/g, '&quot;')}"`)
					.join('');

			if (tagName === 'en-media') {
				const nodeAttributes = attributeToLowerCase(node);
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
					// TODO: Extract this
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
						reject('Hash with no associated resource: ' + hash);
					}
				}

				// If the resource does not appear among the note's resources, it
				// means it's an attachement. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource && !!resource.id) {
					section.lines = addResourceTag(section.lines, resource, nodeAttributes);
					section.lines.push('\n');
				}
			} else if (tagName == 'en-todo') {
				section.lines.push(
					// TODO: maybe just live with the fact that you won't be able to toggle
					// checkboxes on old imported enex imports?
					// Not a big deal because we will only import as HTML for notes with a
					// URL in the metadata, implying that it was clipped from the web (rather
					// than a personal note).
					// TODO: Extract the following note into an issue – in a separate PR,
					// make it clear to the user what the consequences of each import choice is.
					'<input type="checkbox" onclick="alert(\'This note was imported with the ENEX to HTML importer, so you cannot mark to-dos as complete in the preview.\\n\\nTo do so, please update the raw HTML in the editor.\'); return false;" />'
				);
			} else if (node.isSelfClosing) {
				section.lines.push(`<${tagName}${attributesStr}>`);
			} else {
				section.lines.push(`<${tagName}${attributesStr} />`);
			}
		});

		saxStream.on('closetag', function(n) {
			const tagName = n ? n.toLowerCase() : n;
			section.lines.push(`</${tagName}>`);
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
	const stream = stringToStream(xmlString);
	let result = await enexXmlToHtml_(stream, resources, options);

	// TODO: Put this back in
	// let mdLines = [];

	// let firstAttachment = true;
	// for (let i = 0; i < result.resources.length; i++) {
	// 	let r = result.resources[i];
	// 	if (firstAttachment) mdLines.push(NEWLINE);
	// 	mdLines.push(NEWLINE);
	// 	mdLines = addResourceTag(mdLines, r, {alt: r.filename});
	// 	firstAttachment = false;
	// }

	try {
		const preCleaning = result.content.lines.join(''); // xmlString
		const final = await beautifyHtml(preCleaning);
		return final.join('');
	} catch (error) {
		console.warn(error);
	}
}

const beautifyHtml = (html) => {
	return new Promise((resolve, _reject) => {
		const options = {wrap: 0};
		cleanHtml.clean(html, options, (...cleanedHtml) => resolve(cleanedHtml));
	});
};

module.exports = {enexXmlToHtml};

// TODO: consider replacing #cleanHtml with something like the prettyPrint
// example here to remove the extra dependency on `clean-html` this PR added:
// 	 https://github.com/isaacs/sax-js/blob/5aee2163d55cff24b817bbf550bac44841f9df45/examples/pretty-print.js

// TODO: rather than a string, consider using the printer:
//   https://github.com/isaacs/sax-js/blob/5aee2163d55cff24b817bbf550bac44841f9df45/examples/pretty-print.js#L2
