'use strict';

const fs = require('fs-extra');
const { Logger } = require('lib/logger.js');
const { dirname } = require('lib/path-utils.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Setting = require('lib/models/Setting.js');
const { sprintf } = require('sprintf-js');
const exec = require('child_process').exec;

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
});

const baseDir = `${dirname(__dirname)}/tests/cli-integration`;
const joplinAppPath = `${__dirname}/main.js`;

const logger = new Logger();
logger.addTarget('console');
logger.setLevel(Logger.LEVEL_ERROR);

const dbLogger = new Logger();
dbLogger.addTarget('console');
dbLogger.setLevel(Logger.LEVEL_INFO);

const db = new JoplinDatabase(new DatabaseDriverNode());
db.setLogger(dbLogger);

function createClient(id) {
	return {
		id: id,
		profileDir: `${baseDir}/client${id}`,
	};
}

const client = createClient(1);

function execCommand(client, command) {
	const exePath = `node ${joplinAppPath}`;
	const cmd = `${exePath} --update-geolocation-disabled --env dev --profile ${client.profileDir} ${command}`;
	logger.info(`${client.id}: ${command}`);

	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				logger.error(stderr);
				reject(error);
			} else {
				resolve(stdout.trim());
			}
		});
	});
}

function assertTrue(v) {
	if (!v) throw new Error(sprintf('Expected "true", got "%s"."', v));
	process.stdout.write('.');
}

function assertFalse(v) {
	if (v) throw new Error(sprintf('Expected "false", got "%s"."', v));
	process.stdout.write('.');
}

function assertEquals(expected, real) {
	if (expected !== real) throw new Error(sprintf('Expecting "%s", got "%s"', expected, real));
	process.stdout.write('.');
}

async function clearDatabase() {
	await db.transactionExecBatch(['DELETE FROM folders', 'DELETE FROM notes', 'DELETE FROM tags', 'DELETE FROM note_tags', 'DELETE FROM resources', 'DELETE FROM deleted_items']);
}

const testUnits = {};

testUnits.testFolders = async () => {
	await execCommand(client, 'mkbook nb1');

	let folders = await Folder.all();
	assertEquals(1, folders.length);
	assertEquals('nb1', folders[0].title);

	await execCommand(client, 'mkbook nb1');

	folders = await Folder.all();
	assertEquals(1, folders.length);
	assertEquals('nb1', folders[0].title);

	await execCommand(client, 'rm -r -f nb1');

	folders = await Folder.all();
	assertEquals(0, folders.length);
};

testUnits.testNotes = async () => {
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote n1');

	let notes = await Note.all();
	assertEquals(1, notes.length);
	assertEquals('n1', notes[0].title);

	await execCommand(client, 'rm -f n1');
	notes = await Note.all();
	assertEquals(0, notes.length);

	await execCommand(client, 'mknote n1');
	await execCommand(client, 'mknote n2');

	notes = await Note.all();
	assertEquals(2, notes.length);

	await execCommand(client, 'rm -f \'blabla*\'');

	notes = await Note.all();
	assertEquals(2, notes.length);

	await execCommand(client, 'rm -f \'n*\'');

	notes = await Note.all();
	assertEquals(0, notes.length);
};

testUnits.testCat = async () => {
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote mynote');

	const folder = await Folder.loadByTitle('nb1');
	const note = await Note.loadFolderNoteByField(folder.id, 'title', 'mynote');

	let r = await execCommand(client, 'cat mynote');
	assertTrue(r.indexOf('mynote') >= 0);
	assertFalse(r.indexOf(note.id) >= 0);

	r = await execCommand(client, 'cat -v mynote');
	assertTrue(r.indexOf(note.id) >= 0);
};

testUnits.testConfig = async () => {
	await execCommand(client, 'config editor vim');
	await Setting.load();
	assertEquals('vim', Setting.value('editor'));

	await execCommand(client, 'config editor subl');
	await Setting.load();
	assertEquals('subl', Setting.value('editor'));

	const r = await execCommand(client, 'config');
	assertTrue(r.indexOf('editor') >= 0);
	assertTrue(r.indexOf('subl') >= 0);
};

testUnits.testCp = async () => {
	await execCommand(client, 'mkbook nb2');
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote n1');

	await execCommand(client, 'cp n1');

	const f1 = await Folder.loadByTitle('nb1');
	const f2 = await Folder.loadByTitle('nb2');
	let notes = await Note.previews(f1.id);

	assertEquals(2, notes.length);

	await execCommand(client, 'cp n1 nb2');
	const notesF1 = await Note.previews(f1.id);
	assertEquals(2, notesF1.length);
	notes = await Note.previews(f2.id);
	assertEquals(1, notes.length);
	assertEquals(notesF1[0].title, notes[0].title);
};

testUnits.testLs = async () => {
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote note1');
	await execCommand(client, 'mknote note2');
	const r = await execCommand(client, 'ls');

	assertTrue(r.indexOf('note1') >= 0);
	assertTrue(r.indexOf('note2') >= 0);
};

testUnits.testMv = async () => {
	await execCommand(client, 'mkbook nb2');
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote n1');
	await execCommand(client, 'mv n1 nb2');

	const f1 = await Folder.loadByTitle('nb1');
	const f2 = await Folder.loadByTitle('nb2');
	let notes1 = await Note.previews(f1.id);
	let notes2 = await Note.previews(f2.id);

	assertEquals(0, notes1.length);
	assertEquals(1, notes2.length);

	await execCommand(client, 'mknote note1');
	await execCommand(client, 'mknote note2');
	await execCommand(client, 'mknote note3');
	await execCommand(client, 'mknote blabla');
	await execCommand(client, 'mv \'note*\' nb2');

	notes1 = await Note.previews(f1.id);
	notes2 = await Note.previews(f2.id);

	assertEquals(1, notes1.length);
	assertEquals(4, notes2.length);
};

async function main() {
	await fs.remove(baseDir);

	logger.info(await execCommand(client, 'version'));

	await db.open({ name: `${client.profileDir}/database.sqlite` });
	BaseModel.setDb(db);
	await Setting.load();

	let onlyThisTest = 'testMv';
	onlyThisTest = '';

	for (const n in testUnits) {
		if (!testUnits.hasOwnProperty(n)) continue;
		if (onlyThisTest && n != onlyThisTest) continue;

		await clearDatabase();
		const testName = n.substr(4).toLowerCase();
		process.stdout.write(`${testName}: `);
		await testUnits[n]();
		console.info('');
	}
}

main(process.argv).catch(error => {
	console.info('');
	logger.error(error);
});
