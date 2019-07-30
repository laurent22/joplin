const fs = require('fs-extra');

const cwd = process.cwd();
const outputDir = cwd + '/lib/csstojs';

async function createJsFromCss(name, filePath) {
	let css = await fs.readFile(filePath, 'utf-8');
	// eslint-disable-next-line no-useless-escape
	css = css.replace(/\`/g, '\\`');
	const js = 'module.exports = `' + css + '`;';

	const outputPath = outputDir + '/' + name + '.css.js';
	await fs.writeFile(outputPath, js);
}

async function main(argv) {
	await fs.mkdirp(outputDir);
	await createJsFromCss('katex', cwd + '/node_modules/katex/dist/katex.min.css');
	await createJsFromCss('hljs-atom-one-light', cwd + '/node_modules/highlight.js/styles/atom-one-light.css');
	await createJsFromCss('hljs-atom-one-dark-reasonable', cwd + '/node_modules/highlight.js/styles/atom-one-dark-reasonable.css');

	if (argv.indexOf('--copy-fonts') >= 0) {
		await fs.copy(cwd + '/node_modules/katex/dist/fonts', cwd + '/gui/note-viewer/fonts');
	}
}

main(process.argv).catch((error) => {
	console.error(error);
	process.exit(1);
});
