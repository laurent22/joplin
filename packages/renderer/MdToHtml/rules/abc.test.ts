import { describe, test, expect } from '@jest/globals';
import MarkdownIt = require('markdown-it');
import abc from './abc';

describe('abc renderer rule', () => {

	const createMarkdownIt = () => {
		const md = new MarkdownIt();
		const ruleOptions = {
			context: { pluginWasUsed: { abc: false } },
			// By omitting globalSettings entirely, we prevent the parser from trying to run .trim() on an undefined global option.

			// Due to this line in abc.ts... const globalOptions = ruleOptions.globalSettings ? parseGlobalOptions(ruleOptions.globalSettings['markdown.plugin.abc.options']) : {};
		};
		md.use(abc.plugin, ruleOptions);
		return { md, ruleOptions };
	};

	test('tEST MUST PASS WITH PATCH: should render basic abc and set pluginWasUsed', () => {
		const { md, ruleOptions } = createMarkdownIt();
		const input = '```abc\nX:1\nK:G\nC D E F\n```';
		const output = md.render(input);

		expect(output).toContain('joplin-abc-notation');
		expect(ruleOptions.context.pluginWasUsed.abc).toBe(true);
	});

	test('tEST MUST PASS WITH PATCH: should preserve user options', () => {
		const { md } = createMarkdownIt();
		const input = '```abc\n{tablature: [{instrument: "violin"}]}\n---\nX:1\nK:G\n```';
		const output = md.render(input);

		expect(output).toContain('data-abc-options');
		expect(output).toContain('violin');
	});

	test('tEST MUST PASS WITH PATCH: assets should contain max-width fix', () => {
		const assets = abc.assets();
		const css = assets.find(a => a.mime === 'text/css').text;
		expect(css).toContain('max-width: 100%');
	});
});
