/* eslint-disable no-unused-vars */

const { splitCommandBatch } = require('./string-utils');
const StringUtils = require('./string-utils');

describe('StringUtils', () => {



	it('should surround keywords with strings', (async () => {
		const testCases = [
			[[], 'test', 'a', 'b', null, 'test'],
			[['test'], 'test', 'a', 'b', null, 'atestb'],
			[['test'], 'Test', 'a', 'b', null, 'aTestb'],
			[['te[]st'], 'Te[]st', 'a', 'b', null, 'aTe[]stb'],
			// [['test1', 'test2'], 'bla test1 blabla test1 bla test2 not this one - test22', 'a', 'b', 'bla atest1b blabla atest1b bla atest2b not this one - test22'],
			[['test1', 'test2'], 'bla test1 test1 bla test2', '<span class="highlighted-keyword">', '</span>', null, 'bla <span class="highlighted-keyword">test1</span> <span class="highlighted-keyword">test1</span> bla <span class="highlighted-keyword">test2</span>'],
			// [[{ type:'regex', value:'test.*?'}], 'bla test1 test1 bla test2 test tttest', 'a', 'b', 'bla atest1b atest1b bla atest2b atestb tttest'],
			[['test'], 'testTest', 'a', 'b', { escapeHtml: true }, 'atestbaTestb'],
			[['test'], 'test test Test', 'a', 'b', { escapeHtml: true }, 'atestb atestb aTestb'],
			[['d'], 'dfasdf', '[', ']', { escapeHtml: true }, '[d]fas[d]f'],
			[[{ scriptType: 'en', type: 'regex', value: 'd*', valueRegex: 'd[^ \t\n\r,\\.,\\+\\-\\*\\?\\!\\=\\{\\}\\<\\>\\|\\:"\'\\(\\)\\[\\]]*?' }], 'dfasdf', '[', ']', { escapeHtml: true }, '[d]fas[d]f'],
			[['zzz'], 'zzz<img src=q onerror=eval("require(\'child_process\').exec(\'mate-calc\');");>', 'a', 'b', { escapeHtml: true }, 'azzzb&lt;img src=q onerror=eval(&quot;require(&apos;child_process&apos;).exec(&apos;mate-calc&apos;);&quot;);&gt;'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];

			const keywords = t[0];
			const input = t[1];
			const prefix = t[2];
			const suffix = t[3];
			const options = t[4];
			const expected = t[5];

			const actual = StringUtils.surroundKeywords(keywords, input, prefix, suffix, options);

			expect(actual).toBe(expected, `Test case ${i}`);
		}
	}));

	it('should find the next whitespace character', (async () => {
		const testCases = [
			['', [[0, 0]]],
			['Joplin', [[0, 6], [3, 6], [6, 6]]],
			['Joplin is a free, open source\n note taking and *to-do* application', [[0, 6], [12, 17], [23, 29], [48, 54]]],
		];

		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		testCases.forEach((t, i) => {
			const str = t[0];
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			t[1].forEach((pair, j) => {
				const begin = pair[0];
				const expected = pair[1];

				const actual = StringUtils.nextWhitespaceIndex(str, begin);
				expect(actual).toBe(expected, `Test string ${i} - case ${j}`);
			});
		});
	}));

	it('should split the command batch by newlines not inside quotes', (async () => {
		const eol = '\n';
		const testCases = [
			['',
				['']],
			['command1',
				['command1']],
			['command1 arg1 arg2 arg3',
				['command1 arg1 arg2 arg3']],
			[`command1 arg1 'arg2${eol}continue' arg3`,
				[`command1 arg1 'arg2${eol}continue' arg3`]],
			[`command1 arg1 'arg2${eol}continue'${eol}command2${eol}command3 'arg1${eol}continue${eol}continue' arg2 arg3`,
				[`command1 arg1 'arg2${eol}continue'`, 'command2', `command3 'arg1${eol}continue${eol}continue' arg2 arg3`]],
			[`command1 arg\\1 'arg2${eol}continue\\'continue' arg3`,
				[`command1 arg\\1 'arg2${eol}continue\\'continue' arg3`]],
		];

		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		testCases.forEach((t) => {
			expect(splitCommandBatch(t[0])).toEqual(t[1]);
		});
	}));

});
