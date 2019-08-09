/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { filename } = require('lib/path-utils.js');
const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');
const { shim } = require('lib/shim');
const { enexXmlToHtml } = require('lib/import-enex-html-gen.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.warn('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const fileWithPath = (filename) =>
	`${__dirname}/enex_to_html/${filename}`;

/**
 * Tests the importer for a single note, checking that the result of
 * processing the given `.enex` input file matches the contents of the given
 * `.html` file.
 *
 * Note that this does not test the importing of an entire exported `.enex`
 * archive, but rather a single node of such a file. Thus, the test data files
 * (e.g. `./enex_to_html/code1.enex`) correspond to the contents of a single
 * `<note>...</note>` node in an `.enex` file already extracted from
 * `<content><![CDATA[...]]</content>`.
 */
const compareOutputToExpected = (options) => {
	const {inputFile, outputFile, resources} = options;

	it('should convert from Enex to Markdown', asyncTest(async () => {
		const enexInput = await shim.fsDriver().readFile(inputFile);
		const expectedOutput = await shim.fsDriver().readFile(outputFile);

		const actualOutput = await enexXmlToHtml(enexInput, resources);

		if (actualOutput !== expectedOutput) {
			console.info('');
			console.info(`Error converting file: ${filename}.enex`);
			console.info('--------------------------------- Received:');
			console.info(actualOutput.split('\n'));
			console.info('--------------------------------- Expected:');
			console.info(expectedOutput.split('\n'));
			console.info('--------------------------------------------');
			console.info('');

			expect(false).toBe(true);
		}
	}));
};

describe('EnexToHtml', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	compareOutputToExpected({
		inputFile: fileWithPath('checklist-list.enex'),
		outputFile: fileWithPath('checklist-list.html'),
		resources: [],
	});

	compareOutputToExpected({
		inputFile: fileWithPath('en-media-image.enex'),
		outputFile: fileWithPath('en-media-image.html'),
		resources: [{
			filename: '',
			id: '89ce7da62c6b2832929a6964237e98e9', // Mock id
			mime: 'image/jpeg',
			size: 50347,
			title: '',
		}],
	});
});
