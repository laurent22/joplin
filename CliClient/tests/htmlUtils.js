require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const htmlUtils = require('lib/htmlUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('htmlUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should extract image URLs', async (done) => {
		const testCases = [
			['<img src="http://test.com/img.png"/>', ['http://test.com/img.png']],
			['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://test.com/img.png', 'http://test.com/img2.png']],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];

			expect(htmlUtils.extractImageUrls(md).join(' ')).toBe(expected.join(' '));
		}

		done();
	});

	it('should encode attributes', async (done) => {
		const testCases = [
			[{ a: 'one', b: 'two' }, 'a="one" b="two"'],
			[{ a: 'one&two' }, 'a="one&amp;two"'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const attrs = testCases[i][0];
			const expected = testCases[i][1];
			expect(htmlUtils.attributesHtml(attrs)).toBe(expected);
		}

		done();
	});

});