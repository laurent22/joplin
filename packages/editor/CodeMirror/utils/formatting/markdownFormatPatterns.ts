// Shared regex patterns and constants for Markdown formatting utilities.
// Provides centralized definitions of blockquote, list, and other formatting patterns
// to prevent duplication and ensure consistency across formatting modules.
//
// DESIGN ASSUMPTIONS:
// - Blockquote lines follow format "> content" (no leading whitespace before the marker)
// - blockquoteDetectRegex is used to check if a line starts with blockquote marker
// - blockquotePrefixRegex is used to extract complete blockquote prefixes including nesting

// Blockquote extraction pattern: matches zero or more leading blockquote markers (> )
// Supports nested blockquotes and captures leading whitespace.
// PRIMARY USE: toggleInlineMultilineSelectionFormat - extract full prefix to preserve markers
// Example: "  > > text" extracts "  > > "
export const blockquotePrefixRegex = /^(\s*(?:>\s*)+)/;

// Blockquote detection pattern: checks if a line starts with a blockquote marker
// Detects: starts with "> " (blockquote marker + space)
// PRIMARY USE: toggleRegionFormatGlobally - check if line is in blockquote
// LIMITATION: Does NOT support leading whitespace before ">" marker
// Example: "> text" matches, "  > text" does NOT match
export const blockquoteDetectRegex = /^>\s/;

// Length of a single blockquote marker with space ("> ").
// Used for offset calculations when removing blockquote markers from formatted line content.
// ASSUMPTION: Simple "> " structure without leading whitespace
export const singleBlockquoteMarkerLength = '> '.length;

// List prefix pattern: matches list markers at the start of a line
// Supports:
//   - Bullet lists: "- " or "* "
//   - Checklist items: "- [ ]", "- [x]", "- [X]"
//   - Ordered lists: "1. ", "2. ", etc.
// Captures the entire prefix including leading whitespace.
// PRIMARY USE: toggleInlineMultilineSelectionFormat - extract list prefix to preserve markers
// Example: "  - [ ] item" extracts "  - [ ] "
export const listPrefixRegex = /^(\s*(?:[-*+]\s\[[ xX]\]\s|[-*+]\s|\d+[.)]\s))/;
