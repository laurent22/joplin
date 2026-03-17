const sass = require('sass');
const fs = require('fs-extra');
const { basename } = require('path');


// module.exports = async function compileSass(inputPaths, outputPath) {
// 	const promises = [];
// 	for (const inputPath of inputPaths) {
// 		console.info(`Compiling ${inputPath}...`);

// 		promises.push(sassRender({
// 			file: inputPath,
// 			sourceMap: true,
// 			outFile: outputPath,
// 		}));
// 	}

// 	const results = await Promise.all(promises);

// 	const cssString = results.map(r => r.css.toString()).join('\n');
// 	const mapString = results.map(r => r.map.toString()).join('\n');

// 	await Promise.all([
// 		fs.writeFile(outputPath, cssString, 'utf8'),
// 		fs.writeFile(`${outputPath}.map`, mapString, 'utf8'),
// 	]);

// 	console.info(`Generated ${outputPath}`);
// };

module.exports = async function compileSass(inputPath, outputPath) {
	// The SASS doc claims that compile is twice as fast as compileAsync, so if speed
	// turns out to be an issue we could use that instead. The advantage of async is
	// that we can run compilation of each file in parallel (and running other async
	// gulp tasks in parallel too).
	const result = await sass.compileAsync(inputPath, {
		sourceMap: true,
		style: 'expanded',
		sourceMapIncludeSources: true,
	});

	const cssString = [
		result.css.toString(),
		// The .compileAsync API doesn't automatically add the source mapping comment.
		// Without this, the Electron dev tools can't load the original sources.
		`/*# sourceMappingURL=${basename(outputPath)}.map*/`,
	].join('\n');
	const mapString = JSON.stringify(result.sourceMap);

	await Promise.all([
		fs.writeFile(outputPath, cssString, 'utf8'),
		fs.writeFile(`${outputPath}.map`, mapString, 'utf8'),
	]);

	console.info(`Generated ${outputPath}`);
};
