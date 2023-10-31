import { readFile } from 'fs/promises';
import { processMarkdownDoc, processUrls } from './processDocs';
import { basename } from 'path';
import { readdirSync } from 'fs';

const sampleDir = `${__dirname}/processDocsTestSamples`;

interface TestCase {
	sourcePath: string;
	outputPath: string;
}

const makeTestCases = () => {
	const output: TestCase[] = [];
	const files = readdirSync(sampleDir);
	for (const file of files) {
		if (file.endsWith('.mdx')) continue;

		// if (!file.endsWith('blockquotes.md')) continue;

		const sourcePath = `${sampleDir}/${file}`;
		const outputPath = `${sampleDir}/${basename(file, '.md')}.mdx`;
		output.push({
			sourcePath,
			outputPath,
		});
	}
	return output;
};

describe('website/processDocs', () => {

	test.each(makeTestCases())('process a Markdown doc: $sourcePath', async (testCase: TestCase) => {
		const { sourcePath, outputPath } = testCase;
		const sourceContent = await readFile(sourcePath, 'utf-8');
		const expected = await readFile(outputPath, 'utf-8');
		const actual = processMarkdownDoc(sourceContent, { });

		if (actual !== expected) {
			console.info(`
EXPECTED =======================================
${expected}
ACTUAL =========================================
${actual}`);
		}

		expect(actual).toBe(expected);
	});

	test.each([
		[
			'',
			'',
		],
		[
			'[synchronisation set to Joplin Cloud](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/joplin_cloud.md)',
			'[synchronisation set to Joplin Cloud](/help/apps/sync/joplin_cloud)',
		],
		[
			'The notes can be securely [synchronised](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/index.md) using [end-to-end encryption](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/e2ee.md)',
			'The notes can be securely [synchronised](/help/apps/sync) using [end-to-end encryption](/help/apps/sync/e2ee)',
		],
		[
			'The notes can be securely [synchronised](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/index.md) using [end-to-end encryption](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/e2ee.md)',
			'The notes can be securely [synchronised](/help/apps/sync) using [end-to-end encryption](/help/apps/sync/e2ee)',
		],
		[
			'[Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md)',
			'[Configuration screen](/help/apps/config_screen) [Configuration screen](/help/apps/config_screen)',
		],
		[
			'In [command-line mode](https://github.com/laurent22/joplin/blob/dev/readme/apps/terminal.md#command-line-mode), type `import --format md /path/to/file.md`',
			'In [command-line mode](/help/apps/terminal#command-line-mode), type `import --format md /path/to/file.md`',
		],
	])('should process URLs', (input, expected) => {
		const actual = processUrls(input);
		expect(actual).toBe(expected);
	});

});
