const fs = require('fs-extra');
const { dirname } = require('../pathUtils');

const rootDir = dirname(__dirname);
const assetsDir = `${rootDir}/assets`;

async function copyFile(source, dest) {
	const fullDest = `${assetsDir}/${dest}`;
	const dir = dirname(fullDest);
	await fs.mkdirp(dir);
	await fs.copy(source, fullDest);
}

async function main() {
	await fs.remove(assetsDir);

	await copyFile(`${rootDir}/node_modules/katex/dist/katex.min.css`, 'katex/katex.css');
	await copyFile(`${rootDir}/node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2`, 'katex/fonts/KaTeX_Main-Regular.woff2');
	await copyFile(`${rootDir}/node_modules/katex/dist/fonts/KaTeX_Math-Italic.woff2`, 'katex/fonts/KaTeX_Math-Italic.woff2');
	await copyFile(`${rootDir}/node_modules/katex/dist/fonts/KaTeX_Size1-Regular.woff2`, 'katex/fonts/KaTeX_Size1-Regular.woff2');
	await copyFile(`${rootDir}/node_modules/katex/dist/fonts/KaTeX_Size2-Regular.woff2`, 'katex/fonts/KaTeX_Size2-Regular.woff2');
	await copyFile(`${rootDir}/node_modules/katex/dist/fonts/KaTeX_AMS-Regular.woff2`, 'katex/fonts/KaTeX_AMS-Regular.woff2');

	await copyFile(`${rootDir}/node_modules/highlight.js/styles/atom-one-light.css`, 'highlight.js/atom-one-light.css');
	await copyFile(`${rootDir}/node_modules/highlight.js/styles/atom-one-dark-reasonable.css`, 'highlight.js/atom-one-dark-reasonable.css');

	await copyFile(`${rootDir}/node_modules/mermaid/dist/mermaid.min.js`, 'mermaid/mermaid.min.js');
	await copyFile(`${rootDir}/MdToHtml/rules/mermaid_render.js`, 'mermaid/mermaid_render.js');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
