const fs = require('fs-extra');
const spawnSync	= require('child_process').spawnSync;

const babelPath = __dirname + '/node_modules/.bin/babel' + (process.platform === 'win32' ? '.cmd' : '');
const guiPath = __dirname + '/gui';

function fileIsNewerThan(path1, path2) {
	if (!fs.existsSync(path2)) return true;

	const stat1 = fs.statSync(path1);
	const stat2 = fs.statSync(path2);

	return stat1.mtime > stat2.mtime;
}

fs.readdirSync(guiPath).forEach((filename) => {
	const jsxPath = guiPath + '/' + filename;
	const p = jsxPath.split('.');
	if (p.length <= 1) return;
	const ext = p[p.length - 1];
	if (ext !== 'jsx') return;
	p.pop();

	const basePath = p.join('.');

	const jsPath = basePath + '.min.js';

	if (fileIsNewerThan(jsxPath, jsPath)) {
		console.info('Compiling ' + jsxPath + '...');
		const result = spawnSync(babelPath, ['--presets', 'react', '--out-file',jsPath, jsxPath]);
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
