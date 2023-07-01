const utils = require('../utils');
const glob = require('glob');
const rootDir = utils.rootDir();

async function processDirectory(dir) {
	const tsFiles = glob.sync('{**/*.ts,**/*.tsx}', {
		cwd: dir,
	}).filter(f => f !== 'index.ts');

	tsFiles.sort();

	const fileContent = [];

	for (const tsFile of tsFiles) {
		const f = utils.getFilename(tsFile);
		fileContent.push(`import * as ${f} from './${f}';`);
	}

	fileContent.push('');

	fileContent.push('const index:any[] = [');

	for (const tsFile of tsFiles) {
		const f = utils.getFilename(tsFile);
		fileContent.push(`\t${f},`);
	}

	fileContent.push('];');

	fileContent.push('');

	fileContent.push('export default index;');

	const destFile = `${dir}/index.ts`;

	console.info(`Generating ${destFile}...`);

	await utils.insertContentIntoFile(
		destFile,
		'// AUTO-GENERATED using `gulp buildCommandIndex`',
		fileContent.join('\n'),
		true
	);
}

module.exports = {
	src: '',
	fn: async function() {
		await processDirectory(`${rootDir}/packages/app-desktop/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/MainScreen/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteEditor/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteList/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteListControls/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/Sidebar/commands`);
		await processDirectory(`${rootDir}/packages/lib/commands`);
	},
};
