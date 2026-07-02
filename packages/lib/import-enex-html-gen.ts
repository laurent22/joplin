import * as resourceUtils from './resourceUtils';
import { cssValue } from './import-enex-md-gen';
import htmlUtils from './htmlUtils';
import { AllHtmlEntities } from 'html-entities';
import { fixAttributes } from '@joplin/utils/html';
import { ResourceEntity } from './services/database/types';
const stringToStream = require('string-to-stream');

const htmlentities = new AllHtmlEntities().encode;

type Attributes = Record<string, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sax stream node objects are untyped (fork-sax has no .d.ts)
type SaxNode = any;

const addResourceTag = (lines: string[], resource: ResourceEntity, attributes: Attributes): string[] => {
	attributes = fixAttributes(attributes);

	// Note: refactor to use Resource.markdownTag
	if (!attributes.alt) attributes.alt = resource.title;
	if (!attributes.alt) attributes.alt = resource.filename;
	if (!attributes.alt) attributes.alt = '';

	const src = `:/${resource.id}`;

	if (resourceUtils.isImageMimeType(resource.mime)) {
		lines.push(resourceUtils.imgElement({ src, attributes }));
	} else if (resource.mime === 'audio/x-m4a') {
		// TODO: once https://github.com/laurent22/joplin/issues/1794 is resolved,
		// come back to this and make sure it works.
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
};

const attributeToLowerCase = (node: SaxNode): Attributes => {
	if (!node.attributes) return {};
	const output: Attributes = {};
	for (const n in node.attributes) {
		if (!node.attributes.hasOwnProperty(n)) continue;
		output[n.toLowerCase()] = node.attributes[n];
	}
	return output;
};

interface Section {
	type: 'text';
	lines: string[];
	parent: Section | null;
}

interface EnexXmlToHtmlResult {
	content: Section;
	resources: ResourceEntity[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- stream-to-stream output is untyped
const enexXmlToHtml_ = (stream: any, resources: ResourceEntity[]): Promise<EnexXmlToHtmlResult> => {
	const remainingResources = resources.slice();

	const removeRemainingResource = (id: string) => {
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
		const saxStream = require('@joplin/fork-sax').createStream(strict, options);

		const section: Section = {
			type: 'text',
			lines: [],
			parent: null,
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sax error is untyped
		saxStream.on('error', (e: any) => {
			console.warn(e);
		});


		saxStream.on('text', (text: string) => {
			section.lines.push(htmlentities(text));
		});

		saxStream.on('opentag', function(node: SaxNode) {
			const tagName = node.name.toLowerCase();
			const attributesStr = resourceUtils.attributesToStr(node.attributes);
			const nodeAttributes = attributeToLowerCase(node);

			if (tagName === 'en-media') {
				const nodeAttributes = attributeToLowerCase(node);
				const hash = nodeAttributes.hash;

				let resource = null;
				for (let i = 0; i < resources.length; i++) {
					const r = resources[i];
					if (r.id === hash) {
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
							resource = { ...r };
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
				// means it's an attachment. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource && !!resource.id) {
					section.lines = addResourceTag(section.lines, resource, nodeAttributes);
				}
			} else if (tagName === 'en-todo') {
				const checkedHtml = nodeAttributes.checked && nodeAttributes.checked.toLowerCase() === 'true' ? ' checked="checked" ' : ' ';
				section.lines.push(`<input${checkedHtml}type="checkbox" onclick="return false;" />`);
			} else if (tagName === 'li' && cssValue(this, nodeAttributes.style, '--en-checked')) {
				const checkedHtml = cssValue(this, nodeAttributes.style, '--en-checked') === 'true' ? ' checked="checked" ' : ' ';
				section.lines.push(`<${tagName}${attributesStr}> <input${checkedHtml}type="checkbox" onclick="return false;" />`);
			} else if (htmlUtils.isSelfClosingTag(tagName)) {
				section.lines.push(`<${tagName}${attributesStr}/>`);
			} else {
				section.lines.push(`<${tagName}${attributesStr}>`);
			}
		});

		saxStream.on('closetag', (node: string) => {
			const tagName = node ? node.toLowerCase() : node;
			if (!htmlUtils.isSelfClosingTag(tagName) && tagName !== 'en-media' && tagName !== 'en-todo') section.lines.push(`</${tagName}>`);
		});

		saxStream.on('attribute', () => {});

		saxStream.on('end', () => {
			resolve({
				content: section,
				resources: remainingResources,
			});
		});

		stream.pipe(saxStream);
	});
};

// eslint-disable-next-line import/prefer-default-export -- file is named after its functional area, default-export of `enexXmlToHtml` would diverge from the file name
export const enexXmlToHtml = async (xmlString: string, resources: ResourceEntity[]): Promise<string> => {
	const stream = stringToStream(xmlString);
	const result = await enexXmlToHtml_(stream, resources);

	const preCleaning = result.content.lines.join('');
	const final = await beautifyHtml(preCleaning);
	return final.join('');
};

const beautifyHtml = (html: string): Promise<string[]> => {
	// The clean-html package doesn't appear to be robust enough to deal with the crazy HTML that Evernote can generate.
	// In the best case scenario it will throw an error but in some cases it will go into an infinite loop, so
	// for that reason we need to disable it.
	//
	// Fixed https://github.com/laurent22/joplin/issues/3958

	return Promise.resolve([html]);

	// return new Promise((resolve) => {
	// 	try {
	// 		cleanHtml.clean(html, { wrap: 0 }, (...cleanedHtml) => resolve(cleanedHtml));
	// 	} catch (error) {
	// 		console.warn(`Could not clean HTML - the "unclean" version will be used: ${error.message}: ${html.trim().substr(0, 512).replace(/[\n\r]/g, ' ')}...`);
	// 		resolve([html]);
	// 	}
	// });
};
