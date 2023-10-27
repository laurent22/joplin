import { readFile, readdir } from 'fs/promises';
import { processMarkdownDoc } from './processDocs';
import { basename } from 'path';

describe('website/processDocs', () => {

	it('process a Markdown doc', async () => {
		const sampleDir = `${__dirname}/processDocsTestSamples`;
		const files = await readdir(sampleDir);
		for (const file of files) {
			if (file.endsWith('.mdx')) continue;

			if (!file.endsWith('table.md')) continue;

			const sourcePath = `${sampleDir}/${file}`;
			const outputPath = `${sampleDir}/${basename(file, '.md')}.mdx`;
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
		}
	});

});
