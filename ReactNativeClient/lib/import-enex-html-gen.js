const stringToStream = require('string-to-stream');
const cleanHtml = require('clean-html');
const resourceUtils = require('lib/resourceUtils.js');
const { isSelfClosingTag } = require('lib/htmlUtils');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

function addResourceTag(lines, resource, attributes) {
	// Note: refactor to use Resource.markdownTag
	if (!attributes.alt) attributes.alt = resource.title;
	if (!attributes.alt) attributes.alt = resource.filename;
	if (!attributes.alt) attributes.alt = '';

	const src = `:/${resource.id}`;

	if (resourceUtils.isImageMimeType(resource.mime)) {
		lines.push(resourceUtils.imgElement({ src, attributes }));
	} else if (resource.mime === 'audio/x-m4a') {
		/**
		 * TODO: once https://github.com/laurent22/joplin/issues/1794 is resolved,
		 * come back to this and make sure it works.
		 */
		lines.push(resourceUtils.audioElement({
			src,
			alt: attributes.alt,
			id: resource.id,
		}));
	} else {
		// TODO: figure out what other mime types can be handled more gracefully
		lines.push(resourceUtils.attachmentElement({
			src,
			attributes,
			id: resource.id,
		}));
	}

	return lines;
}

function attributeToLowerCase(node) {
	if (!node.attributes) return {};
	const output = {};
	for (const n in node.attributes) {
		if (!node.attributes.hasOwnProperty(n)) continue;
		output[n.toLowerCase()] = node.attributes[n];
	}
	return output;
}

function enexXmlToHtml_(stream, resources) {
	const remainingResources = resources.slice();

	const removeRemainingResource = id => {
		for (let i = 0; i < remainingResources.length; i++) {
			const r = remainingResources[i];
			if (r.id === id) {
				remainingResources.splice(i, 1);
			}
		}
	};

	return new Promise((resolve) => {
		const options = {};
		const strict = false;
		const saxStream = require('sax').createStream(strict, options);

		const section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		saxStream.on('error', function(e) {
			console.warn(e);
		});


		saxStream.on('text', function(text) {
			section.lines.push(htmlentities(text));
		});

		saxStream.on('opentag', function(node) {
			const tagName = node.name.toLowerCase();
			const attributesStr = resourceUtils.attributesToStr(node.attributes);

			if (tagName === 'en-media') {
				const nodeAttributes = attributeToLowerCase(node);
				const hash = nodeAttributes.hash;

				let resource = null;
				for (let i = 0; i < resources.length; i++) {
					const r = resources[i];
					if (r.id == hash) {
						resource = r;
						removeRemainingResource(r.id);
						break;
					}
				}

				if (!resource) {
					// TODO: Extract this duplicate of code in ./import-enex-md-gen.js
					let found = false;
					for (let i = 0; i < remainingResources.length; i++) {
						const r = remainingResources[i];
						if (!r.id) {
							resource = Object.assign({}, r);
							resource.id = hash;
							remainingResources.splice(i, 1);
							found = true;
							break;
						}
					}

					if (!found) {
						// console.warn(`Hash with no associated resource: ${hash}`);
					}
				}

				// If the resource does not appear among the note's resources, it
				// means it's an attachement. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource && !!resource.id) {
					section.lines = addResourceTag(section.lines, resource, nodeAttributes);
				}
			} else if (tagName == 'en-todo') {
				const nodeAttributes = attributeToLowerCase(node);
				const checkedHtml = nodeAttributes.checked && nodeAttributes.checked.toLowerCase() == 'true' ? ' checked="checked" ' : ' ';
				section.lines.push(`<input${checkedHtml}type="checkbox" onclick="return false;" />`);
			} else if (isSelfClosingTag(tagName)) {
				section.lines.push(`<${tagName}${attributesStr}/>`);
			} else {
				section.lines.push(`<${tagName}${attributesStr}>`);
			}
		});

		saxStream.on('closetag', function(node) {
			const tagName = node ? node.toLowerCase() : node;
			if (!isSelfClosingTag(tagName)) section.lines.push(`</${tagName}>`);
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

async function enexXmlToHtml(xmlString, resources, options = {}) {
	const stream = stringToStream(xmlString);
	const result = await enexXmlToHtml_(stream, resources, options);

	const preCleaning = result.content.lines.join('');
	const final = await beautifyHtml(preCleaning);
	return final.join('');
}

const beautifyHtml = (html) => {
	return new Promise((resolve) => {
		try {
			cleanHtml.clean(html, { wrap: 0 }, (...cleanedHtml) => resolve(cleanedHtml));
		} catch (error) {
			console.warn(`Could not clean HTML - the "unclean" version will be used: ${error.message}: ${html.trim().substr(0, 512).replace(/[\n\r]/g, ' ')}...`);
			resolve([html]);
		}
	});
};

module.exports = { enexXmlToHtml };
