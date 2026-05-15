"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enexXmlToHtml = enexXmlToHtml;
/* eslint-disable @typescript-eslint/no-explicit-any */
const stringToStream = require("string-to-stream");
const resourceUtils = require("./resourceUtils");
const import_enex_md_gen_1 = require("./import-enex-md-gen");
const htmlUtils_1 = require("./htmlUtils");
const Entities = require('html-entities').AllHtmlEntities;
const { fixAttributes } = require('@joplin/utils/html');
const htmlentities = new Entities().encode;
function addResourceTag(lines, resource, attributes) {
    attributes = fixAttributes(attributes);
    // Note: refactor to use Resource.markdownTag
    if (!attributes.alt)
        attributes.alt = resource.title;
    if (!attributes.alt)
        attributes.alt = resource.filename;
    if (!attributes.alt)
        attributes.alt = '';
    const src = `:/${resource.id}`;
    if (resourceUtils.isImageMimeType(resource.mime)) {
        lines.push(resourceUtils.imgElement({ src, attributes }));
    }
    else if (resource.mime === 'audio/x-m4a') {
        // TODO: once https://github.com/laurent22/joplin/issues/1794 is resolved,
        // come back to this and make sure it works.
        lines.push(resourceUtils.audioElement({
            src,
            alt: attributes.alt,
            id: resource.id,
            attributes: {},
        }));
    }
    else {
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
    if (!node.attributes)
        return {};
    const output = {};
    for (const n in node.attributes) {
        if (!Object.prototype.hasOwnProperty.call(node.attributes, n))
            continue;
        output[n.toLowerCase()] = node.attributes[n];
    }
    return output;
}
function enexXmlToHtml_(stream, resources) {
    const remainingResources = resources.slice();
    const removeRemainingResource = (id) => {
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
        const section = {
            type: 'text',
            lines: [],
            parent: null,
        };
        saxStream.on('error', (e) => {
            console.warn(e);
        });
        saxStream.on('text', (text) => {
            section.lines.push(htmlentities(text));
        });
        saxStream.on('opentag', function (node) {
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
                if (resource && !!resource.id) {
                    section.lines = addResourceTag(section.lines, resource, nodeAttributes);
                }
            }
            else if (tagName === 'en-todo') {
                const checkedHtml = nodeAttributes.checked && nodeAttributes.checked.toLowerCase() === 'true' ? ' checked="checked" ' : ' ';
                section.lines.push(`<input${checkedHtml}type="checkbox" onclick="return false;" />`);
            }
            else if (tagName === 'li' && (0, import_enex_md_gen_1.cssValue)(this, nodeAttributes.style, '--en-checked')) {
                const checkedHtml = (0, import_enex_md_gen_1.cssValue)(this, nodeAttributes.style, '--en-checked') === 'true' ? ' checked="checked" ' : ' ';
                section.lines.push(`<${tagName}${attributesStr}> <input${checkedHtml}type="checkbox" onclick="return false;" />`);
            }
            else if (htmlUtils_1.default.isSelfClosingTag(tagName)) {
                section.lines.push(`<${tagName}${attributesStr}/>`);
            }
            else {
                section.lines.push(`<${tagName}${attributesStr}>`);
            }
        });
        saxStream.on('closetag', (node) => {
            const tagName = node ? node.toLowerCase() : node;
            if (!htmlUtils_1.default.isSelfClosingTag(tagName) && tagName !== 'en-media' && tagName !== 'en-todo')
                section.lines.push(`</${tagName}>`);
        });
        saxStream.on('attribute', () => { });
        saxStream.on('end', () => {
            resolve({
                content: section,
                resources: remainingResources,
            });
        });
        stream.pipe(saxStream);
    });
}
const beautifyHtml = (html) => {
    return [html];
};
async function enexXmlToHtml(xmlString, resources) {
    const stream = stringToStream(xmlString);
    const result = await enexXmlToHtml_(stream, resources);
    const preCleaning = result.content.lines.join('');
    const final = await beautifyHtml(preCleaning);
    return final.join('');
}
//# sourceMappingURL=import-enex-html-gen.js.map