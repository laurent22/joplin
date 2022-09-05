const fs = require('fs-extra');
const spawnSync	= require('child_process').spawnSync;
const { chdir } = require('process');

const basePath = `${__dirname}/../../..`;

function fileIsNewerThan(path1, path2) {
	if (!fs.existsSync(path2)) return true;

	const stat1 = fs.statSync(path1);
	const stat2 = fs.statSync(path2);

	return stat1.mtime > stat2.mtime;
}

function convertJsx(paths) {
	chdir(`${__dirname}/..`);

	paths.forEach(path => {
		fs.readdirSync(path).forEach((filename) => {
			const jsxPath = `${path}/${filename}`;
			const p = jsxPath.split('.');
			if (p.length <= 1) return;
			const ext = p[p.length - 1];
			if (ext !== 'jsx') return;
			p.pop();

			const basePath = p.join('.');

			const jsPath = `${basePath}.min.js`;

			if (fileIsNewerThan(jsxPath, jsPath)) {
				console.info(`Compiling ${jsxPath}...`);

				// { shell: true } is needed to get it working on Windows:
				// https://discourse.joplinapp.org/t/attempting-to-build-on-windows/22559/12
				const result = spawnSync('yarn', ['run', 'babel', '--presets', 'react', '--out-file', jsPath, jsxPath], { shell: true });
				if (result.status !== 0) {
					const msg = [];
					if (result.stdout) msg.push(result.stdout.toString());
					if (result.stderr) msg.push(result.stderr.toString());
					console.error(msg.join('\n'));
					if (result.error) console.error(result.error);
					process.exit(result.status);
				}
			}
		});
	});
}

module.exports = function() {
	convertJsx([
		`${__dirname}/../gui`,
		`${__dirname}/../gui/MainScreen`,
		`${__dirname}/../gui/NoteList`,
		`${__dirname}/../plugins`,
	]);

	const libContent = [
		fs.readFileSync(`${basePath}/packages/lib/string-utils-common.js`, 'utf8'),
		fs.readFileSync(`${basePath}/packages/lib/markJsUtils.js`, 'utf8'),
		fs.readFileSync(`${basePath}/packages/lib/renderers/webviewLib.js`, 'utf8'),
	];

	fs.writeFileSync(`${__dirname}/../gui/note-viewer/lib.js`, libContent.join('\n'), 'utf8');

	return Promise.resolve();
};
