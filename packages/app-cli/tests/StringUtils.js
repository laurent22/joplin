/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest } = require('test-utils.js');
const StringUtils = require('lib/string-utils');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('StringUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should surround keywords with strings', asyncTest(async () => {
		const testCases = [
			[[], 'test', 'a', 'b', 'test'],
			[['test'], 'test', 'a', 'b', 'atestb'],
			[['test'], 'Test', 'a', 'b', 'aTestb'],
			[['te[]st'], 'Te[]st', 'a', 'b', 'aTe[]stb'],
			// [['test1', 'test2'], 'bla test1 blabla test1 bla test2 not this one - test22', 'a', 'b', 'bla atest1b blabla atest1b bla atest2b not this one - test22'],
			[['test1', 'test2'], 'bla test1 test1 bla test2', '<span class="highlighted-keyword">', '</span>', 'bla <span class="highlighted-keyword">test1</span> <span class="highlighted-keyword">test1</span> bla <span class="highlighted-keyword">test2</span>'],
			// [[{ type:'regex', value:'test.*?'}], 'bla test1 test1 bla test2 test tttest', 'a', 'b', 'bla atest1b atest1b bla atest2b atestb tttest'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];

			const keywords = t[0];
			const input = t[1];
			const prefix = t[2];
			const suffix = t[3];
			const expected = t[4];

			const actual = StringUtils.surroundKeywords(keywords, input, prefix, suffix);

			expect(actual).toBe(expected, `Test case ${i}`);
		}
	}));

	it('should find the next whitespace character', asyncTest(async () => {
		const testCases = [
			['', [[0, 0]]],
			['Joplin', [[0, 6], [3, 6], [6, 6]]],
			['Joplin is a free, open source\n note taking and *to-do* application', [[0, 6], [12, 17], [23, 29], [48, 54]]],
		];

		testCases.forEach((t, i) => {
			const str = t[0];
			t[1].forEach((pair, j) => {
				const begin = pair[0];
				const expected = pair[1];

				const actual = StringUtils.nextWhitespaceIndex(str, begin);
				expect(actual).toBe(expected, `Test string ${i} - case ${j}`);
			});
		});
	}));

});
