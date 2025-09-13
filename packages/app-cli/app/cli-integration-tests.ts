'use strict';

/* eslint-disable no-console */

import * as fs from 'fs-extra';
import Logger, { TargetType } from '@joplin/utils/Logger';
import { dirname } from '@joplin/lib/path-utils';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
const { sprintf } = require('sprintf-js');
const exec = require('child_process').exec;
const nodeSqlite = require('sqlite3');
const { loadKeychainServiceAndSettings } = require('@joplin/lib/services/SettingUtils');
const { default: shimInitCli } = require('./utils/shimInitCli');

const baseDir = `${dirname(__dirname)}/tests/cli-integration`;
const joplinAppPath = `${__dirname}/main.js`;

shimInitCli({ nodeSqlite, appVersion: () => require('../package.json').version, keytar: null });
require('@joplin/lib/testing/test-utils');

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(Logger.LEVEL_ERROR);

const dbLogger = new Logger();
dbLogger.addTarget(TargetType.Console);
dbLogger.setLevel(Logger.LEVEL_INFO);

const db = new JoplinDatabase(new DatabaseDriverNode());
db.setLogger(dbLogger);

interface Client {
	id: number;
	profileDir: string;
}

function createClient(id: number): Client {
	return {
		id: id,
		profileDir: `${baseDir}/client${id}`,
	};
}

const client = createClient(1);

function execCommand(client: Client, command: string) {
	const exePath = `node ${joplinAppPath}`;
	const cmd = `${exePath} --update-geolocation-disabled --env dev --profile ${client.profileDir} ${command}`;
	logger.info(`${client.id}: ${command}`);

	return new Promise<string>((resolve, reject) => {
		exec(cmd, (error: string, stdout: string, stderr: string) => {
			if (error) {
				logger.error(stderr);
				reject(error);
			} else {
				resolve(stdout.trim());
			}
		});
	});
}

function assertTrue(v: unknown) {
	if (!v) throw new Error(sprintf('Expected "true", got "%s"."', v));
	process.stdout.write('.');
}

function assertFalse(v: unknown) {
	if (v) throw new Error(sprintf('Expected "false", got "%s"."', v));
	process.stdout.write('.');
}

function assertEquals(expected: unknown, real: unknown) {
	if (expected !== real) throw new Error(sprintf('Expecting "%s", got "%s"', expected, real));
	process.stdout.write('.');
}

async function clearDatabase() {
	await db.transactionExecBatch(['DELETE FROM folders', 'DELETE FROM notes', 'DELETE FROM tags', 'DELETE FROM note_tags', 'DELETE FROM resources', 'DELETE FROM deleted_items']);
}

const testUnits: Record<string, ()=> Promise<void>> = {};

testUnits.testFolders = async () => {
	await execCommand(client, 'mkbook nb1');

	let folders = await Folder.all();
	assertEquals(1, folders.length);
	assertEquals('nb1', folders[0].title);

	await execCommand(client, 'mkbook nb1');

	folders = await Folder.all();
	assertEquals(2, folders.length);
	assertEquals('nb1', folders[0].title);
	assertEquals('nb1', folders[1].title);

	await execCommand(client, 'rmbook -p -f nb1');

	folders = await Folder.all();
	assertEquals(1, folders.length);

	await execCommand(client, 'rmbook -p -f nb1');

	folders = await Folder.all();
	assertEquals(0, folders.length);
};

testUnits.testNotes = async () => {
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mknote n1');

	let notes = await Note.all();
	assertEquals(1, notes.length);
	assertEquals('n1', notes[0].title);

	await execCommand(client, 'rmnote -p -f n1');
	notes = await Note.all();
	assertEquals(0, notes.length);

	await execCommand(client, 'mknote n1');
	await execCommand(client, 'mknote n2');

	notes = await Note.all();
	assertEquals(2, notes.length);

	// Should fail to delete a non-existent note
	let failed = false;
	try {
		await execCommand(client, 'rmnote -f \'blabla*\'');
	} catch (error) {
		failed = true;
	}
	assertEquals(failed, true);

	notes = await Note.all();
	assertEquals(2, notes.length);

	await execCommand(client, 'rmnote -f -p \'n*\'');

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
	await Setting.reset();
	await Setting.load();
	assertEquals('vim', Setting.value('editor'));

	await execCommand(client, 'config editor subl');
	await Setting.reset();
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

	notes1 = await Note.previews(f1.id);
	notes2 = await Note.previews(f2.id);

	assertEquals(4, notes1.length);
	assertEquals(1, notes2.length);

	await execCommand(client, 'mv \'note*\' nb2');

	notes2 = await Note.previews(f2.id);
	notes1 = await Note.previews(f1.id);

	assertEquals(1, notes1.length);
	assertEquals(4, notes2.length);
};

testUnits.testUse = async () => {
	await execCommand(client, 'mkbook nb1');
	await execCommand(client, 'mkbook nb2');
	await execCommand(client, 'mknote n1');
	await execCommand(client, 'mknote n2');

	const f1 = await Folder.loadByTitle('nb1');
	const f2 = await Folder.loadByTitle('nb2');
	let notes1 = await Note.previews(f1.id);
	let notes2 = await Note.previews(f2.id);

	assertEquals(0, notes1.length);
	assertEquals(2, notes2.length);

	await execCommand(client, 'use nb1');
	await execCommand(client, 'mknote note2');
	await execCommand(client, 'mknote note3');

	notes1 = await Note.previews(f1.id);
	notes2 = await Note.previews(f2.id);

	assertEquals(2, notes1.length);
	assertEquals(2, notes2.length);
};

async function main() {
	await fs.remove(baseDir);

	logger.info(await execCommand(client, 'version'));

	await db.open({ name: `${client.profileDir}/database.sqlite` });
	BaseModel.setDb(db);
	Setting.setConstant('rootProfileDir', client.profileDir);
	Setting.setConstant('profileDir', client.profileDir);
	await loadKeychainServiceAndSettings([]);

	let onlyThisTest = 'testMv';
	onlyThisTest = '';

	for (const n in testUnits) {
		if (!testUnits.hasOwnProperty(n)) continue;
		if (onlyThisTest && n !== onlyThisTest) continue;

		await clearDatabase();
		const testName = n.substr(4).toLowerCase();
		process.stdout.write(`${testName}: `);
		await testUnits[n]();
		console.info('');
	}
}

main().catch(error => {
	console.info('');
	logger.error(error);
});
