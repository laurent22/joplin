import { readFile } from 'fs/promises';
import { processMarkdownDoc } from './processDocs';
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

		// if (!file.endsWith('image_in_link.md')) continue;

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

});
