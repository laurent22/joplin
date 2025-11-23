"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRenderedNoteMetadata = void 0;
const parseRenderedNoteMetadata = (noteHtml) => {
    const output = {
        printTitle: true,
    };
    // <!-- joplin-metadata-print-title = false -->
    const match = noteHtml.match(/<!--[\s]+joplin-metadata-(.*?)[\s]+=[\s]+(.*?)[\s]+-->/);
    if (match) {
        const [, propName, propValue] = match;
        if (propName === 'print-title') {
            output.printTitle = propValue.toLowerCase() === 'true' || propValue === '1';
        }
        else {
            throw new Error(`Unknown view metadata: ${propName}`);
        }
    }
    return output;
};
exports.parseRenderedNoteMetadata = parseRenderedNoteMetadata;
