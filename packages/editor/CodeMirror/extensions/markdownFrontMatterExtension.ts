// Extension for parsing and highlighting YAML FrontMatter blocks at the start of a document.
//
// A FrontMatter block is delimited by --- at the very start of the document:
// ---
// title: My Document
// date: 2024-01-01
// ---

import { Tag } from '@lezer/highlight';
import { parseMixed, SyntaxNodeRef, Input, NestedParse, ParseWrapper } from '@lezer/common';
import { MarkdownConfig, BlockContext, Line, LeafBlock, MarkdownExtension } from '@lezer/markdown';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';

export const frontMatterTagName = 'FrontMatter';
export const frontMatterContentTagName = 'FrontMatterContent';
export const frontMatterMarkerTagName = 'FrontMatterMarker';

export const frontMatterTag = Tag.define();

// Create the YAML language parser using the legacy mode
const yamlLanguage = StreamLanguage.define(yaml);

// Wraps a YAML parser for the FrontMatter content.
// This replaces [nodeTag] from the syntax tree with a region handled by the YAML parser.
const wrappedYamlParser = (nodeTag: string): ParseWrapper => {
	return parseMixed((node: SyntaxNodeRef, _input: Input): NestedParse => {
		if (node.name !== nodeTag) {
			return null;
		}

		return {
			parser: yamlLanguage.parser,
		};
	});
};

// Regex to match the FrontMatter delimiter (--- at start of line)
const frontMatterDelimiterRegex = /^---\s*$/;

const frontMatterConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: frontMatterTagName,
			style: frontMatterTag,
		},
		{
			name: frontMatterContentTagName,
		},
		{
			name: frontMatterMarkerTagName,
			style: frontMatterTag,
		},
	],
	parseBlock: [{
		name: frontMatterTagName,
		before: 'HorizontalRule',
		parse(cx: BlockContext, line: Line): boolean {
			// FrontMatter must be at the very start of the document
			if (cx.lineStart !== 0) {
				return false;
			}

			// Check if the first line is ---
			if (!frontMatterDelimiterRegex.test(line.text)) {
				return false;
			}

			// Store the opening delimiter position
			const openingMarkerStart = cx.lineStart;
			const openingMarkerEnd = cx.lineStart + line.text.length;

			const contentStart = openingMarkerEnd + 1; // Start after the opening --- and newline
			let foundEnd = false;

			// Consume lines until we find the closing ---
			while (cx.nextLine()) {
				if (frontMatterDelimiterRegex.test(line.text)) {
					foundEnd = true;
					break;
				}
			}

			if (!foundEnd) {
				// No closing delimiter found - not a valid FrontMatter block
				return false;
			}

			// The content is between the two --- delimiters
			const contentEnd = cx.lineStart; // Start of the closing --- line

			// Closing delimiter positions
			const closingMarkerStart = cx.lineStart;
			const closingMarkerEnd = cx.lineStart + line.text.length;

			// Create marker elements for the --- delimiters
			const openingMarkerElem = cx.elt(frontMatterMarkerTagName, openingMarkerStart, openingMarkerEnd);
			const closingMarkerElem = cx.elt(frontMatterMarkerTagName, closingMarkerStart, closingMarkerEnd);

			// Create the content element (the YAML content between delimiters)
			const contentElem = cx.elt(frontMatterContentTagName, contentStart, contentEnd);

			// Create the container element spanning from start of first --- to end of last ---
			const containerElement = cx.elt(
				frontMatterTagName,
				0, // Start at document beginning
				closingMarkerEnd, // End after closing ---
				[openingMarkerElem, contentElem, closingMarkerElem],
			);

			cx.addElement(containerElement);

			// Move past the closing delimiter
			cx.nextLine();

			return true;
		},
		// FrontMatter blocks can end leaf blocks like paragraphs
		endLeaf(_cx: BlockContext, line: Line, _leaf: LeafBlock): boolean {
			return frontMatterDelimiterRegex.test(line.text);
		},
	}],
	wrap: wrappedYamlParser(frontMatterContentTagName),
};

const markdownFrontMatterExtension: MarkdownExtension = [frontMatterConfig];

export default markdownFrontMatterExtension;
