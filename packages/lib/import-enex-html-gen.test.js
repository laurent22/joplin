const { setupDatabaseAndSynchronizer, switchClient, supportDir } = require('./testing/test-utils.js');
const shim = require('./shim').default;
const { enexXmlToHtml } = require('./import-enex-html-gen.js');

const fileWithPath = (filename) =>
	`${supportDir}/../enex_to_html/${filename}`;

const audioResource = {
	filename: 'audio test',
	id: '9168ee833d03c5ea7c730ac6673978c1',
	mime: 'audio/x-m4a',
	size: 82011,
	title: 'audio test',
};

// Tests the importer for a single note, checking that the result of
// processing the given `.enex` input file matches the contents of the given
// `.html` file.
//
// Note that this does not test the importing of an entire exported `.enex`
// archive, but rather a single node of such a file. Thus, the test data files
// (e.g. `./enex_to_html/code1.enex`) correspond to the contents of a single
// `<note>...</note>` node in an `.enex` file already extracted from
// `<content><![CDATA[...]]</content>`.
const compareOutputToExpected = (options) => {
	options = {
		resources: [],
		...options,
	};

	const inputFile = fileWithPath(`${options.testName}.enex`);
	const outputFile = fileWithPath(`${options.testName}.html`);
	const testTitle = `should convert from Enex to Html: ${options.testName}`;

	// eslint-disable-next-line jest/require-top-level-describe
	it(testTitle, (async () => {
		const enexInput = await shim.fsDriver().readFile(inputFile);
		const expectedOutput = await shim.fsDriver().readFile(outputFile);
		const actualOutput = (await enexXmlToHtml(enexInput, options.resources)).trim();
		expect(actualOutput).toEqual(expectedOutput);
	}));
};

describe('EnexToHtml', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	compareOutputToExpected({
		testName: 'checkbox-list',
	});

	compareOutputToExpected({
		testName: 'checklist',
	});

	compareOutputToExpected({
		testName: 'svg',
	});

	compareOutputToExpected({
		testName: 'en-media--image',
		resources: [{
			filename: '',
			id: '89ce7da62c6b2832929a6964237e98e9', // Mock id
			mime: 'image/jpeg',
			size: 50347,
			title: '',
		}],
	});

	compareOutputToExpected({
		testName: 'en-media--audio',
		resources: [audioResource],
	});

	compareOutputToExpected({
		testName: 'attachment',
		resources: [{
			filename: 'attachment-1',
			id: '21ca2b948f222a38802940ec7e2e5de3',
			mime: 'application/pdf', // Any non-image/non-audio mime type will do
			size: 1000,
		}],
	});

	compareOutputToExpected({
		testName: 'attachment-image',
		resources: [{
			filename: 'attachment-image',
			id: 'e2d4887c5a32ab1686276c7c5ae733ef',
			mime: 'image/jpeg', // Any non-image/non-audio mime type will do
			width: '1.125in',
		}],
	});

	compareOutputToExpected({
		testName: 'quoted-attributes',
	});

	// it('fails when not given a matching resource', (async () => {
	// 	// To test the promise-unexpectedly-resolved case, add `audioResource` to the array.
	// 	const resources = [];
	// 	const inputFile = fileWithPath('en-media--image.enex');
	// 	const enexInput = await shim.fsDriver().readFile(inputFile);
	// 	const promisedOutput = enexXmlToHtml(enexInput, resources);

	// 	promisedOutput.then(() => {
	// 		// Promise should not be resolved
	// 		expect(false).toEqual(true);
	// 	}, (reason) => {
	// 		expect(reason)
	// 			.toBe('Hash with no associated resource: 89ce7da62c6b2832929a6964237e98e9');
	// 	});
	// }));

});
