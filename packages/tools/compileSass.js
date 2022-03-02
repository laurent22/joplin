const sass = require('sass');
const fs = require('fs-extra');

// The SASS doc claims that renderSync is twice as fast as render, so if speed
// turns out to be an issue we could use that instead. The advantage of async is
// that we can run complation of each file in parallel (and running other async
// gulp tasks in parallel too).

// sasss.render is old school async, so convert it to a promise here.
async function sassRender(options) {
	return new Promise((resolve, reject) => {
		sass.render(options, ((error, result) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		}));
	});
}

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
	const result = await sassRender({
		file: inputPath,
		sourceMap: true,
		outFile: outputPath,
		outputStyle: 'compressed',
		indentType: 'tab',
	});

	const cssString = result.css.toString();
	const mapString = result.map.toString();

	await Promise.all([
		fs.writeFile(outputPath, cssString, 'utf8'),
		fs.writeFile(`${outputPath}.map`, mapString, 'utf8'),
	]);

	console.info(`Generated ${outputPath}`);
};
