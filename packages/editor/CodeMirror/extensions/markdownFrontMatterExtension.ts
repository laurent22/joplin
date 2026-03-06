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

			// If the document starts with --- always claim it as a frontmatter block,
			// even when the closing delimiter is absent.
			const openingMarkerStart = cx.lineStart;
			const openingMarkerEnd = cx.lineStart + line.text.length;
			const contentStart = openingMarkerEnd + 1;

			let foundEnd = false;

			// Consume lines until we find the closing --- or reach end of document.
			while (cx.nextLine()) {
				if (frontMatterDelimiterRegex.test(line.text)) {
					foundEnd = true;
					break;
				}
			}

			// cx.lineStart now points to the closing --- (if found) or end of document (if not).
			const contentEnd = cx.lineStart;

			const openingMarkerElem = cx.elt(frontMatterMarkerTagName, openingMarkerStart, openingMarkerEnd);
			const contentElem = cx.elt(frontMatterContentTagName, contentStart, contentEnd);

			if (foundEnd) {
				const closingMarkerStart = cx.lineStart;
				const closingMarkerEnd = cx.lineStart + line.text.length;
				const closingMarkerElem = cx.elt(frontMatterMarkerTagName, closingMarkerStart, closingMarkerEnd);

				const containerElement = cx.elt(
					frontMatterTagName,
					0,
					closingMarkerEnd,
					[openingMarkerElem, contentElem, closingMarkerElem],
				);
				cx.addElement(containerElement);
				cx.nextLine();
			} else {
				const containerElement = cx.elt(
					frontMatterTagName,
					0,
					contentEnd,
					[openingMarkerElem, contentElem],
				);
				cx.addElement(containerElement);
			}

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
