// Takes a directory of TypeScript files and generate an index from it.

const utils = require('../utils');
const glob = require('glob');
const rootDir = utils.rootDir();

async function processDirectory(dir, indexFilePath = null, typeScriptType = null, imports = null, importNameTemplate = null, exportNameTemplate = null) {
	if (!indexFilePath) indexFilePath = `${dir}/index.ts`;
	if (!typeScriptType) typeScriptType = 'any';
	if (!importNameTemplate) importNameTemplate = '* as FILE_NAME';
	if (!exportNameTemplate) exportNameTemplate = 'FILE_NAME';

	const tsFiles = glob.sync('{*.ts,*.tsx}', {
		cwd: dir,
	}).filter(f => `${dir}/${f}` !== indexFilePath)
	//
	// Exclude Jest test files to
	// not include them in index.ts
	//
		.filter(f => !f.endsWith('.test.ts'));

	tsFiles.sort();

	const fileContent = [];

	for (const tsFile of tsFiles) {
		const f = utils.getFilename(tsFile);
		fileContent.push(`import ${importNameTemplate.replace(/FILE_NAME/g, f)} from './${f}';`);
	}

	fileContent.push('');

	if (imports) {
		fileContent.push(imports);
		fileContent.push('');
	}

	fileContent.push(`const index: ${typeScriptType}[] = [`);

	for (const tsFile of tsFiles) {
		const f = utils.getFilename(tsFile);
		fileContent.push(`\t${exportNameTemplate.replace(/FILE_NAME/g, f)},`);
	}

	fileContent.push('];');

	fileContent.push('');

	fileContent.push('export default index;');

	console.info(`Generating ${indexFilePath}...`);

	await utils.insertContentIntoFile(
		indexFilePath,
		'// AUTO-GENERATED using `gulp buildScriptIndexes`',
		fileContent.join('\n'),
		true,
	);
}

module.exports = {
	src: '',
	fn: async function() {
		await processDirectory(`${rootDir}/packages/app-desktop/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/WindowCommandsAndDialogs/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteEditor/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteList/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/NoteListControls/commands`);
		await processDirectory(`${rootDir}/packages/app-desktop/gui/Sidebar/commands`);
		await processDirectory(`${rootDir}/packages/app-mobile/commands`);
		await processDirectory(`${rootDir}/packages/app-mobile/components/screens/Note/commands`);
		await processDirectory(`${rootDir}/packages/lib/commands`);

		await processDirectory(
			`${rootDir}/packages/lib/services/database/migrations`,
			null,
			'Migration',
			'import { Migration } from \'../types\';',
			'migrationFILE_NAME',
			'migrationFILE_NAME',
		);
	},
};
