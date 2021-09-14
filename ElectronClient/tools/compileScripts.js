const fs = require('fs-extra');
const spawnSync	= require('child_process').spawnSync;

const babelPath = `${__dirname}/../node_modules/.bin/babel${process.platform === 'win32' ? '.cmd' : ''}`;
const basePath = `${__dirname}/../..`;

function fileIsNewerThan(path1, path2) {
	if (!fs.existsSync(path2)) return true;

	const stat1 = fs.statSync(path1);
	const stat2 = fs.statSync(path2);

	return stat1.mtime > stat2.mtime;
}

function convertJsx(path) {
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
			const result = spawnSync(babelPath, ['--presets', 'react', '--out-file', jsPath, jsxPath]);
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
}

module.exports = function() {
	convertJsx(`${__dirname}/../gui`);
	convertJsx(`${__dirname}/../gui/SideBar`);
	convertJsx(`${__dirname}/../gui/MainScreen`);
	convertJsx(`${__dirname}/../gui/Header`);
	convertJsx(`${__dirname}/../gui/NoteList`);
	convertJsx(`${__dirname}/../plugins`);

	const libContent = [
		fs.readFileSync(`${basePath}/ReactNativeClient/lib/string-utils-common.js`, 'utf8'),
		fs.readFileSync(`${basePath}/ReactNativeClient/lib/markJsUtils.js`, 'utf8'),
		fs.readFileSync(`${basePath}/ReactNativeClient/lib/renderers/webviewLib.js`, 'utf8'),
	];

	fs.writeFileSync(`${__dirname}/../gui/note-viewer/lib.js`, libContent.join('\n'), 'utf8');

	return Promise.resolve();
};
