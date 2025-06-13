import { exists, mkdir, readFile, remove } from 'fs-extra';
import { join } from 'path';
import htmlpack from '.';

const outputDirectory = './test-output';

describe('htmlpack/index', () => {
	beforeEach(async () => {
		if (await exists(outputDirectory)) {
			await remove(outputDirectory);
		}
		await mkdir(outputDirectory);
	});

	test('should convert HTML into a single file', async () => {
		const outputFile = join(outputDirectory, 'output.html');
		await htmlpack(join('test-data', 'index.html'), outputFile);

		const outputContent = await readFile(outputFile, 'utf8');
		expect(outputContent).toBe(`
<html>
    <head>
        <style>* {
  color: red;
}</style>
    </head>
    <body>
        <h1>Test</h1>
        <a href="data:text/plain;base64,UmVzb3VyY2Uu" download="resource.txt">Test link.</a>
        <img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSItOTUgLTk2IDIwOCAyMDgiIHdpZHRoPSIyMDgiIGhlaWdodD0iMjA4IiB2ZXJzaW9uPSIxLjEiIGJhc2VQcm9maWxlPSJmdWxsIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHN0eWxlPSJmb250LXNpemU6IDY0cHg7IGZpbGw6IHJlZDsiPlRlc3Q8L3RleHQ+PC9zdmc+" alt="test image"/>
        <p>Test paragraph</p>
    </body>
</html>`);
	});
});
