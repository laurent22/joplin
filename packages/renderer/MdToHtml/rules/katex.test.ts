import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MarkdownIt = require('markdown-it');
import katexRule from './katex';

// Non-breaking space (U+00A0) inside math is the canonical trigger — this is
// what emails, Word, and web pastes typically inject and what KaTeX complains
// about with strict:'warn'.
const nbspMath = '$x = 1$';

const createMarkdownIt = (strict?: unknown) => {
	const md = new MarkdownIt();
	const context = {
		userData: {} as Record<string, unknown>,
		pluginWasUsed: { katex: false } as Record<string, boolean>,
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin signature uses a narrower MarkdownIt type than the one exposed by markdown-it's own types
	md.use(katexRule.plugin as any, { context, strict });
	return md;
};

describe('katex rule', () => {

	let warnSpy: jest.SpiedFunction<typeof console.warn>;

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	test('warns by default on LaTeX-incompatible input', () => {
		const md = createMarkdownIt();
		const output = md.render(nbspMath);
		expect(output).toContain('katex');
		const warned = warnSpy.mock.calls.some(args => String(args[0]).includes('LaTeX-incompatible'));
		expect(warned).toBe(true);
	});

	test('is silent when strict:"ignore" is passed via plugin options', () => {
		const md = createMarkdownIt('ignore');
		const output = md.render(nbspMath);
		expect(output).toContain('katex');
		const warned = warnSpy.mock.calls.some(args => String(args[0]).includes('LaTeX-incompatible'));
		expect(warned).toBe(false);
	});
});
