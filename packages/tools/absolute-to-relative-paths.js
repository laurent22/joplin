const glob = require('glob');
const fs = require('fs-extra');
const dirname = require('path').dirname;
const relative = require('relative');

const libDir = `${dirname(__dirname)}/lib`;

// function getBasename(p) {
// 	const pieces = p.split('/');
// 	pieces.pop();
// 	return pieces.join('/');
// }

function toLinuxPath(p) {
	return p.replace(/\\/g, '/');
}

function getRelativePath(from, to) {
	let p = relative(from, to);
	if (p.indexOf('.') !== 0) p = `./${p}`;
	return toLinuxPath(p);
}

async function main() {
	const files = glob.sync(`${libDir}{/**/*.ts,/**/*.tsx,/**/*.js}`, {
		ignore: [
			'**/node_modules/**',
			'**/*.d.ts',
		],
	}).map(f => f.substr(libDir.length + 1));

	for (const file of files) {
		const content = await fs.readFile(`${libDir}/${file}`, 'utf8');

		const newContent = content.replace(/('|")(inner\/lib\/.*)('|")/g, (_matched, p1, p2, p3) => {
			const absoluteRequirePath = p2.substr(10);
			const relativePath = getRelativePath(file, absoluteRequirePath);
			return p1 + relativePath + p3;
		});

		await fs.writeFile(`${libDir}/${file}`, newContent, 'utf8');
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
