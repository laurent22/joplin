import { splitCommandBatch } from './string-utils';
import * as StringUtils from './string-utils';

describe('string-utils', () => {

	// cSpell:disable
	test.each([
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
		[
			[{
				scriptType: 'en',
				type: 'regex',
				value: 'd*',
				valueRegex: 'd[^ \t\n\r,\\.,\\+\\-\\*\\?\\!\\=\\{\\}\\<\\>\\|\\:"\'\\(\\)\\[\\]]*?',
			} as StringUtils.KeywordObjectType],
			'dfasdf', '[', ']', { escapeHtml: true }, '[d]fas[d]f',
		],
		[['zzz'], 'zzz<img src=q onerror=eval("require(\'child_process\').exec(\'mate-calc\');");>', 'a', 'b', { escapeHtml: true }, 'azzzb&lt;img src=q onerror=eval(&quot;require(&apos;child_process&apos;).exec(&apos;mate-calc&apos;);&quot;);&gt;'],
		[['a'], 'non-latin-chars-éão', '<span>', '</span>', { escapeHtml: true }, 'non-l<span>a</span>tin-ch<span>a</span>rs-&eacute;<span>&atilde;</span>o'],
		[['o'], 'Abrir diretório de perfis > (openProfileDirectory)', '<span>', '</span>', { escapeHtml: true },
			'Abrir diret<span>&oacute;</span>ri<span>o</span> de perfis &gt; (<span>o</span>penPr<span>o</span>fileDirect<span>o</span>ry)'],
		[[], '<>"\'&', 'a', 'b', { escapeHtml: true }, '&lt;&gt;&quot;&apos;&amp;'],
		[[], '<>"\'&', 'a', 'b', { escapeHtml: false }, '<>"\'&'],
		[['a'], 'non-latin-chars-éão', '<<<', '>>>', { escapeHtml: false }, 'non-l<<<a>>>tin-ch<<<a>>>rs-é<<<ã>>>o'],
	])('should surround keywords with strings (case %#)', (async (keywords, input, prefix, suffix, options, expected) => {
		const actual = StringUtils.surroundKeywords(keywords, input, prefix, suffix, options);

		expect(actual).toBe(expected);
	}));
	// cSpell:enable

	test.each([
		['', [[0, 0]]],
		['Joplin', [[0, 6], [3, 6], [6, 6]]],
		['Joplin is a free, open source\n note taking and *to-do* application', [[0, 6], [12, 17], [23, 29], [48, 54]]],
	])('should find the next whitespace character in string %s', (async (str, testCases) => {
		for (const range of testCases) {
			const begin = range[0];
			const expected = range[1];

			const actual = StringUtils.nextWhitespaceIndex(str, begin);
			expect(actual).toBe(expected);
		}
	}));

	const eol = '\n';
	test.each([
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
	])('should split the command batch by newlines not inside quotes (case %#)', (async (batch, expected) => {
		expect(splitCommandBatch(batch)).toEqual(expected);
	}));

});
