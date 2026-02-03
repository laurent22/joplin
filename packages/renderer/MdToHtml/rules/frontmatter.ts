import type * as MarkdownIt from 'markdown-it';
import type * as StateBlock from 'markdown-it/lib/rules_block/state_block';
import hljs from '../../highlight';

// Regex to match the FrontMatter delimiter (--- at start of line, optionally with trailing whitespace)
const frontMatterDelimiterRegex = /^---\s*$/;

const plugin = (markdownIt: MarkdownIt, _ruleOptions: unknown) => {
	// Add a block rule to parse frontmatter at the beginning of the document
	markdownIt.block.ruler.before('fence', 'frontmatter', (state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean => {
		// FrontMatter must be at the very start of the document
		if (startLine !== 0) {
			return false;
		}

		const startPos = state.bMarks[startLine] + state.tShift[startLine];
		const startMax = state.eMarks[startLine];
		const startLineText = state.src.slice(startPos, startMax);

		// Check if the first line is ---
		if (!frontMatterDelimiterRegex.test(startLineText)) {
			return false;
		}

		// Find the closing ---
		let nextLine = startLine + 1;
		let foundEnd = false;

		while (nextLine < endLine) {
			const pos = state.bMarks[nextLine] + state.tShift[nextLine];
			const max = state.eMarks[nextLine];
			const lineText = state.src.slice(pos, max);

			if (frontMatterDelimiterRegex.test(lineText)) {
				foundEnd = true;
				break;
			}
			nextLine++;
		}

		if (!foundEnd) {
			// No closing delimiter - not a valid FrontMatter block
			return false;
		}

		// If we're just checking if the rule matches (silent mode), return true
		if (silent) {
			return true;
		}

		// Extract the content between the delimiters
		const contentStartLine = startLine + 1;
		const contentEndLine = nextLine;

		let content = '';
		for (let line = contentStartLine; line < contentEndLine; line++) {
			const pos = state.bMarks[line];
			const max = state.eMarks[line];
			content += `${state.src.slice(pos, max)}\n`;
		}
		// Remove trailing newline
		content = content.slice(0, -1);

		// Create the token
		const token = state.push('frontmatter', 'div', 0);
		token.content = content;
		token.map = [startLine, nextLine + 1];
		token.markup = '---';

		// Move past the closing delimiter
		state.line = nextLine + 1;

		return true;
	});

	// Add a renderer for the frontmatter token
	markdownIt.renderer.rules.frontmatter = (tokens, idx) => {
		const token = tokens[idx];
		const content = token.content;
		const escapeHtml = markdownIt.utils.escapeHtml;

		// Escape the content for HTML
		const contentHtml = escapeHtml(content);

		// Apply YAML syntax highlighting
		let highlightedContent: string;
		try {
			if (hljs.getLanguage('yaml')) {
				highlightedContent = hljs.highlight(content, { language: 'yaml', ignoreIllegals: true }).value;
			} else {
				highlightedContent = contentHtml;
			}
		} catch (_error) {
			highlightedContent = contentHtml;
		}

		// Return the joplin-editable block structure
		// The source block contains just the YAML content (without delimiters)
		// The data-joplin-source-open and data-joplin-source-close attributes define
		// what gets prepended/appended when converting back to markdown
		// &#10; is the HTML entity for newline
		// Note: We use <pre class="hljs"> without a <code> child to avoid the
		// isCodeBlock() detection in turndown which would convert it to a fenced code block
		// IMPORTANT: No whitespace between joplin-editable and joplin-source elements!
		// The turndown joplinEditableBlockInfo function iterates childNodes and crashes
		// on text nodes (whitespace) because they don't have classList.
		return `<div class="joplin-editable joplin-frontmatter"><pre class="joplin-source" data-joplin-language="frontmatter" data-joplin-source-open="---&#10;" data-joplin-source-close="&#10;---&#10;">${contentHtml}</pre><div class="joplin-rendered joplin-frontmatter-rendered"><hr class="joplin-frontmatter-marker"/><pre class="hljs">${highlightedContent}</pre><hr class="joplin-frontmatter-marker"/></div></div>`;
	};
};

const assets = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				.joplin-frontmatter-rendered {
					margin-bottom: 1em;
				}
				.joplin-frontmatter-rendered pre.hljs {
					margin: 0;
					border-radius: 0;
				}
				.joplin-frontmatter-marker {
					margin: 0;
					border: none;
					border-top: 2px solid var(--joplin-divider-color, #ccc);
				}
			`,
		},
	].map(e => {
		return {
			source: 'frontmatter',
			...e,
		};
	});
};

export default {
	plugin,
	assets,
};
