// Based on https://github.com/waylonflinn/markdown-it-katex

'use strict';

let katex = require('katex');
const md5 = require('md5');
const mhchemModule = require('./katex_mhchem.js');

// Katex macros include circular references so we need
// to serialize them with json-stringify-safe
const stringifySafe = require('json-stringify-safe');

katex = mhchemModule(katex);

// Test if potential opening or closing delimieter
// Assumes that there is a "$" at state.src[pos]
function isValidDelim(state, pos) {
	var prevChar,
		nextChar,
		max = state.posMax,
		can_open = true,
		can_close = true;

	prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
	nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

	// Check non-whitespace conditions for opening and closing, and
	// check that closing delimeter isn't followed by a number
	if (prevChar === 0x20 /* " " */ || prevChar === 0x09 /* \t */ || (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */) {
		can_close = false;
	}
	if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
		can_open = false;
	}

	return {
		can_open: can_open,
		can_close: can_close,
	};
}

function math_inline(state, silent) {
	var start, match, token, res, pos;

	if (state.src[state.pos] !== '$') {
		return false;
	}

	res = isValidDelim(state, state.pos);
	if (!res.can_open) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos += 1;
		return true;
	}

	// First check for and bypass all properly escaped delimieters
	// This loop will assume that the first leading backtick can not
	// be the first character in state.src, which is known since
	// we have found an opening delimieter already.
	start = state.pos + 1;
	match = start;
	while ((match = state.src.indexOf('$', match)) !== -1) {
		// Found potential $, look for escapes, pos will point to
		// first non escape when complete
		pos = match - 1;
		while (state.src[pos] === '\\') {
			pos -= 1;
		}

		// Even number of escapes, potential closing delimiter found
		if ((match - pos) % 2 == 1) {
			break;
		}
		match += 1;
	}

	// No closing delimter found.  Consume $ and continue.
	if (match === -1) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos = start;
		return true;
	}

	// Check if we have empty content, ie: $$.  Do not parse.
	if (match - start === 0) {
		if (!silent) {
			state.pending += '$$';
		}
		state.pos = start + 1;
		return true;
	}

	// Check for valid closing delimiter
	res = isValidDelim(state, match);
	if (!res.can_close) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos = start;
		return true;
	}

	if (!silent) {
		token = state.push('math_inline', 'math', 0);
		token.markup = '$';
		token.content = state.src.slice(start, match);
	}

	state.pos = match + 1;
	return true;
}

function math_block(state, start, end, silent) {
	var firstLine,
		lastLine,
		next,
		lastPos,
		found = false,
		token,
		pos = state.bMarks[start] + state.tShift[start],
		max = state.eMarks[start];

	if (pos + 2 > max) {
		return false;
	}
	if (state.src.slice(pos, pos + 2) !== '$$') {
		return false;
	}

	pos += 2;
	firstLine = state.src.slice(pos, max);

	if (silent) {
		return true;
	}
	if (firstLine.trim().slice(-2) === '$$') {
		// Single line expression
		firstLine = firstLine.trim().slice(0, -2);
		found = true;
	}

	for (next = start; !found;) {
		next++;

		if (next >= end) {
			break;
		}

		pos = state.bMarks[next] + state.tShift[next];
		max = state.eMarks[next];

		if (pos < max && state.tShift[next] < state.blkIndent) {
			// non-empty line with negative indent should stop the list:
			break;
		}

		if (
			state.src
				.slice(pos, max)
				.trim()
				.slice(-2) === '$$'
		) {
			lastPos = state.src.slice(0, max).lastIndexOf('$$');
			lastLine = state.src.slice(pos, lastPos);
			found = true;
		}
	}

	state.line = next + 1;

	token = state.push('math_block', 'math', 0);
	token.block = true;
	token.content = (firstLine && firstLine.trim() ? `${firstLine}\n` : '') + state.getLines(start + 1, next, state.tShift[start], true) + (lastLine && lastLine.trim() ? lastLine : '');
	token.map = [start, state.line];
	token.markup = '$$';
	return true;
}

let cache_ = {};

module.exports = function(context) {
	// Keep macros that persist across Katex blocks to allow defining a macro
	// in one block and re-using it later in other blocks.
	// https://github.com/laurent22/joplin/issues/1105
	context.__katex = { macros: {} };

	const addContextAssets = () => {
		context.pluginAssets['katex'] = [
			{ name: 'katex.css' },
			{ name: 'fonts/KaTeX_Main-Regular.woff2' },
			{ name: 'fonts/KaTeX_Main-Bold.woff2' },
			{ name: 'fonts/KaTeX_Main-BoldItalic.woff2' },
			{ name: 'fonts/KaTeX_Main-Italic.woff2' },
			{ name: 'fonts/KaTeX_Math-Italic.woff2' },
			{ name: 'fonts/KaTeX_Math-BoldItalic.woff2' },
			{ name: 'fonts/KaTeX_Size1-Regular.woff2' },
			{ name: 'fonts/KaTeX_Size2-Regular.woff2' },
			{ name: 'fonts/KaTeX_Size3-Regular.woff2' },
			{ name: 'fonts/KaTeX_Size4-Regular.woff2' },
			{ name: 'fonts/KaTeX_AMS-Regular.woff2' },
			{ name: 'fonts/KaTeX_Caligraphic-Bold.woff2' },
			{ name: 'fonts/KaTeX_Caligraphic-Regular.woff2' },
			{ name: 'fonts/KaTeX_Fraktur-Bold.woff2' },
			{ name: 'fonts/KaTeX_Fraktur-Regular.woff2' },
			{ name: 'fonts/KaTeX_SansSerif-Bold.woff2' },
			{ name: 'fonts/KaTeX_SansSerif-Italic.woff2' },
			{ name: 'fonts/KaTeX_SansSerif-Regular.woff2' },
			{ name: 'fonts/KaTeX_Script-Regular.woff2' },
			{ name: 'fonts/KaTeX_Typewriter-Regular.woff2' },
		];
	};

	function renderToStringWithCache(latex, options) {
		const cacheKey = md5(escape(latex) + escape(stringifySafe(options)));
		if (cacheKey in cache_) {
			return cache_[cacheKey];
		} else {
			const beforeMacros = stringifySafe(options.macros);
			const output = katex.renderToString(latex, options);
			const afterMacros = stringifySafe(options.macros);

			// Don't cache the formulas that add macros, otherwise
			// they won't be added on second run.
			if (beforeMacros === afterMacros) cache_[cacheKey] = output;
			return output;
		}
	}

	return function(md, options) {
		// Default options

		options = options || {};
		options.macros = context.__katex.macros;
		options.trust = true;

		// set KaTeX as the renderer for markdown-it-simplemath
		var katexInline = function(latex) {
			options.displayMode = false;
			try {
				return renderToStringWithCache(latex, options);
			} catch (error) {
				console.error('Katex error for:', latex, error);
				return latex;
			}
		};

		var inlineRenderer = function(tokens, idx) {
			addContextAssets();
			return katexInline(tokens[idx].content);
		};

		var katexBlock = function(latex) {
			options.displayMode = true;
			try {
				return `<p>${renderToStringWithCache(latex, options)}</p>`;
			} catch (error) {
				console.error('Katex error for:', latex, error);
				return latex;
			}
		};

		var blockRenderer = function(tokens, idx) {
			addContextAssets();
			return `${katexBlock(tokens[idx].content)}\n`;
		};

		md.inline.ruler.after('escape', 'math_inline', math_inline);
		md.block.ruler.after('blockquote', 'math_block', math_block, {
			alt: ['paragraph', 'reference', 'blockquote', 'list'],
		});
		md.renderer.rules.math_inline = inlineRenderer;
		md.renderer.rules.math_block = blockRenderer;
	};
};
